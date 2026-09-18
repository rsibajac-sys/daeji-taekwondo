import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// 1. Importamos la herramienta de la base de datos
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // RECUERDA PONER TUS LLAVES REALES AQUÍ
  apiKey: "AIzaSyCbFyxKpb0Ab_uIjRSoMDYiilnPe3sSVxI",
  authDomain: "daeji-taekwondo.firebaseapp.com",
  projectId: "daeji-taekwondo",
  storageBucket: "daeji-taekwondo.firebasestorage.app",
  messagingSenderId: "941120406853",
  appId: "1:941120406853:web:8a044009fddd86431b2a2c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// 2. Encendemos la base de datos y la exportamos como "db" (database)
export const db = getFirestore(app);