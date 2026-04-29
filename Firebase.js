// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCQFw1Fus6PhAD4a0v3bn5De34mpw5zPpY",
  authDomain: "haruki-a3f09.firebaseapp.com",
  projectId: "haruki-a3f09",
  storageBucket: "haruki-a3f09.firebasestorage.app",
  messagingSenderId: "498040943665",
  appId: "1:498040943665:web:663983698a73af6d3d5110",
  measurementId: "G-XCHY7SR5R5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);