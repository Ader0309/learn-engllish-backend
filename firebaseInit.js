import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    setDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import "dotenv/config.js";
import { update } from "firebase/database";
const firebaseConfig = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

//新增資料
// await setDoc(doc(db, "users/test/vocab/banana"), {
//     english: "banana",
//     chinese: "香蕉",
// });
// await setDoc(doc(db, "users", "test", "vocab", "cat"), {
//     english: "cat",
//     chinese: "貓",
// });
//新增資料
// let english = "desk";
// let chinese = "桌子";
// await setDoc(doc(db, `users/test/vocab/${english}`), {
//     english: english,
//     chinese: chinese,
// });

//讀取所有資料
// const data = await getDocs(collection(db, "users/test/vocab"));
// const dataArray = [];
// data.forEach((doc) => {
//     dataArray.push(doc.data());
// });
// console.log(dataArray);

//讀取單筆資料
// const data = await getDoc(doc(db, "users/test/vocab/apple"));
// console.log(data.data());

//刪除資料
// await deleteDoc(doc(db, "users/test/vocab/cat"));
