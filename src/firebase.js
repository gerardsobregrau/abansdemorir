import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración predeterminada temporal para demostración
// Idealmente esto debería ir en un archivo .env
const firebaseConfig = {
    apiKey: "demo-api-key",
    authDomain: "demo-project.firebaseapp.com",
    projectId: "atesdemorir-demo",
    storageBucket: "demo-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
