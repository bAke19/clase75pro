// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore} from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoEK7ZCbac8bNEjwi0DmDp2qXtE1P95Qg",
  authDomain: "biblioteca-digital-pract-226f1.firebaseapp.com",
  projectId: "biblioteca-digital-pract-226f1",
  storageBucket: "biblioteca-digital-pract-226f1.appspot.com",
  messagingSenderId: "977438712517",
  appId: "1:977438712517:web:ae9a14df6c896c259286ac"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default db;