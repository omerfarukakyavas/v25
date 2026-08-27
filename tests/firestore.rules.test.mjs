import fs from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';

const projectId = 'demo-akyavas-portal';
const applicationId = 'akyavas-hts';
const ownerUid = 'owner-uid';
const clientUid = 'client-uid';
const clientId = '42';
const accessId = 'owner-uid_42';

let testEnv;

const path = (...parts) => parts.join('/');
const sourceCasePath = path('artifacts', applicationId, 'users', ownerUid, 'davalar', '1');
const accessPath = path('artifacts', applicationId, 'portalAccess', accessId);
const profilePath = path('artifacts', applicationId, 'portalProfiles', clientUid);
const safeCasePath = path('artifacts', applicationId, 'portalOwners', ownerUid, 'clients', clientId, 'cases', 'dava-1');

async function seedPortal({ profileEmail = 'client@example.com', accessEmail = 'client@example.com' } = {}) {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, accessPath), {
      accessId,
      ownerUid,
      muvekkilId: clientId,
      email: accessEmail,
      aktif: true
    });
    await setDoc(doc(db, profilePath), {
      uid: clientUid,
      accessId,
      ownerUid,
      muvekkilId: clientId,
      email: profileEmail
    });
    await setDoc(doc(db, safeCasePath), {
      id: 'dava-1',
      tur: 'dava',
      baslik: '2026/1',
      durum: 'Derdest'
    });
    await setDoc(doc(db, sourceCasePath), {
      id: 1,
      notlar: 'Müvekkile kapalı iç not',
      finansalIslemler: [{ tutar: 1000 }]
    });
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync('firestore.rules', 'utf8')
    }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test('ofis sahibi kendi kayıtlarını okuyup yazabilir, diğer hesaplar erişemez', async () => {
  const ownerDb = testEnv.authenticatedContext(ownerUid, { email: 'owner@example.com' }).firestore();
  const outsiderDb = testEnv.authenticatedContext('outsider-uid', { email: 'outsider@example.com' }).firestore();
  const guestDb = testEnv.unauthenticatedContext().firestore();

  await assertSucceeds(setDoc(doc(ownerDb, sourceCasePath), { id: 1, konu: 'Test' }));
  await assertSucceeds(getDoc(doc(ownerDb, sourceCasePath)));
  await assertFails(getDoc(doc(outsiderDb, sourceCasePath)));
  await assertFails(setDoc(doc(outsiderDb, sourceCasePath), { id: 1 }));
  await assertFails(getDoc(doc(guestDb, sourceCasePath)));
});

test('müvekkil yalnızca kendisine ayrılmış güvenli dosya özetini okuyabilir', async () => {
  await seedPortal();
  const clientDb = testEnv.authenticatedContext(clientUid, {
    email: 'client@example.com',
    email_verified: true
  }).firestore();

  const safeCase = await assertSucceeds(getDoc(doc(clientDb, safeCasePath)));
  assert.equal(safeCase.data()?.['baslik'], '2026/1');
  await assertFails(getDoc(doc(clientDb, sourceCasePath)));
  await assertFails(setDoc(doc(clientDb, safeCasePath), { durum: 'Değiştirildi' }, { merge: true }));
});

test('başka bir müvekkil güvenli özeti okuyamaz', async () => {
  await seedPortal();
  const otherClientDb = testEnv.authenticatedContext('other-client', {
    email: 'other@example.com',
    email_verified: true
  }).firestore();

  await assertFails(getDoc(doc(otherClientDb, safeCasePath)));
});

test('portal profili ile erişim e-postası uyuşmazsa dosya görünmez', async () => {
  await seedPortal({ accessEmail: 'new-client@example.com' });
  const oldClientDb = testEnv.authenticatedContext(clientUid, {
    email: 'client@example.com',
    email_verified: true
  }).firestore();

  await assertFails(getDoc(doc(oldClientDb, safeCasePath)));
});

test('doğrulanmış davet e-postası portal profilini oluşturabilir', async () => {
  const token = 'secure-invite-token';
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, path('artifacts', applicationId, 'portalInvites', token)), {
      accessId,
      ownerUid,
      muvekkilId: clientId,
      email: 'client@example.com',
      aktif: true,
      sonKullanmaTarihi: Timestamp.fromDate(new Date(Date.now() + 86_400_000))
    });
  });

  const verifiedDb = testEnv.authenticatedContext(clientUid, {
    email: 'client@example.com',
    email_verified: true
  }).firestore();
  await assertSucceeds(setDoc(doc(verifiedDb, profilePath), {
    uid: clientUid,
    accessId,
    ownerUid,
    muvekkilId: clientId,
    email: 'client@example.com',
    inviteToken: token
  }));
});

test('doğrulanmamış veya yanlış e-postalı hesap daveti kullanamaz', async () => {
  const token = 'secure-invite-token';
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), path('artifacts', applicationId, 'portalInvites', token)), {
      accessId,
      ownerUid,
      muvekkilId: clientId,
      email: 'client@example.com',
      aktif: true,
      sonKullanmaTarihi: Timestamp.fromDate(new Date(Date.now() + 86_400_000))
    });
  });

  const unverifiedDb = testEnv.authenticatedContext(clientUid, {
    email: 'client@example.com',
    email_verified: false
  }).firestore();
  await assertFails(setDoc(doc(unverifiedDb, profilePath), {
    uid: clientUid,
    accessId,
    ownerUid,
    muvekkilId: clientId,
    email: 'client@example.com',
    inviteToken: token
  }));

  const wrongEmailDb = testEnv.authenticatedContext('wrong-email-uid', {
    email: 'wrong@example.com',
    email_verified: true
  }).firestore();
  await assertFails(setDoc(doc(wrongEmailDb, path('artifacts', applicationId, 'portalProfiles', 'wrong-email-uid')), {
    uid: 'wrong-email-uid',
    accessId,
    ownerUid,
    muvekkilId: clientId,
    email: 'wrong@example.com',
    inviteToken: token
  }));
});
