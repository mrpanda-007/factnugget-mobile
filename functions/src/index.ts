import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { createMyFamily, getMyFamilyStatus } from './familyBootstrap.js';
