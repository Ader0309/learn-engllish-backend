import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
    collection,
    setDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
} from "firebase/firestore";
import "dotenv/config";
// const firebaseConfig = {
//     apiKey: process.env.APIKEY,
//     authDomain: process.env.AUTH_DOMAIN,
//     projectId: process.env.PROJECT_ID,
//     storageBucket: process.env.STORAGE_BUCKET,
//     messagingSenderId: process.env.MESSAGING_SENDER_ID,
//     appId: process.env.APP_ID,
//     measurementId: process.env.MEASUREMENT_ID,
// };

// 初始化firebase
// const firebaseApp = initializeApp(firebaseConfig);
const firebaseApp = initializeApp({
    credential: applicationDefault(),
});

// 初始化firestore
const db = getFirestore(firebaseApp);
const app = express();
const port = process.env.PORT || 8080;

//設置cors
//允許的來源
const allowedOrigins = ["http://localhost:5173"];
const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error("不允許的CORS"));
        }
    },
};

app.use(express.static("public"));
// 使用cors middleware
app.use(cors(corsOptions));
app.use(express.json());

const apiRouter = express.Router();

// 判斷中文及能輸入空格或頓號
function verifyChinese(text) {
    const regex = /^[\u4e00-\u9fa5\s、]+$/;
    return regex.test(text);
}
// 判斷僅能輸入英文
function verifyEnglish(text) {
    const regex = /^[a-zA-Z]+$/;
    return regex.test(text);
}

// 驗證姓名欄位(中英文數字，不得含空格與特殊符號)
function verifyName(text) {
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9]*$/;
    return regex.test(text);
}

// 驗證信箱
function verifyEmail(text) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(text);
}

//取得所有單字
apiRouter.get("/english-list", async (req, res) => {
    try {
        const userAccount = req.headers["x-user-account"];
        const collectionRef = db.collection(`users/${userAccount}/vocab`);
        const snapshot = await getDocs(collectionRef);
        const englishList = snapshot.docs.map((doc) => doc.data());
        // const docEnglishes = collection(db, `users/${userAccount}/vocab`);
        // const snapshot = await getDocs(docEnglishes);
        // const englishList = snapshot.docs.map((doc) => doc.data());
        return res
            .status(200)
            .json({ status: "success", message: englishList });
    } catch (err) {
        console.error("失敗訊息", err);
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

//取得全部收藏單字
apiRouter.get("/important-english-list", async (req, res) => {
    try {
        const userAccount = req.headers["x-user-account"];
        const docEnglishes = collection(db, `users/${userAccount}/vocab`);
        const snapshot = await getDocs(
            query(docEnglishes, where("important", "==", true))
        );
        const englishList = snapshot.docs.map((doc) => doc.data());
        return res
            .status(200)
            .json({ status: "success", message: englishList });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

// 查詢單字
apiRouter.get("/english", async (req, res) => {
    try {
        const { english } = req.query;
        const userAccount = req.headers["x-user-account"];
        if (english === "") {
            return res
                .status(400)
                .json({ status: "error", message: "請輸入要搜尋之單字" });
        }
        const docEnglish = doc(db, `users/${userAccount}/vocab/${english}`);
        const docCheck = await getDoc(docEnglish);
        if (docCheck.exists()) {
            return res.status(200).json({
                status: "success",
                message: docCheck.data(),
            });
        }
        return res.status(400).json({ status: "error", message: "查無此單字" });
    } catch (err) {
        console.error("錯誤", err);
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

// 查詢收藏單字
apiRouter.get("/english-important", async (req, res) => {
    try {
        const { english } = req.query;
        const userAccount = req.headers["x-user-account"];
        if (english === "") {
            return res
                .status(400)
                .json({ status: "error", message: "請輸入要搜尋之單字" });
        }
        const docEnglish = collection(db, `users/${userAccount}/vocab`);
        const q = query(
            docEnglish,
            where("important", "==", true),
            where("english", "==", english)
        );
        const docCheck = await getDocs(q);
        if (!docCheck.empty) {
            const docData = docCheck.docs[0].data();
            return res.status(200).json({
                status: "success",
                message: docData,
            });
        }
        return res.status(400).json({ status: "error", message: "查無此單字" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});
// 新增單字
apiRouter.post("/english", async (req, res) => {
    try {
        const { english, chinese } = req.body;
        const userAccount = req.headers["x-user-account"];
        if (english === "" || chinese === "") {
            return res
                .status(400)
                .json({ status: "error", message: "輸入欄位不得為空" });
        }
        if (!verifyEnglish(english)) {
            return res
                .status(400)
                .json({ status: "error", message: "請輸入正確英文格式" });
        }
        if (!verifyChinese(chinese)) {
            return res.status(400).json({
                status: "error",
                message: `請輸入正確中文格式
                (可已空白或頓號分隔)`,
            });
        }
        const docEnglish = doc(db, `users/${userAccount}/vocab/${english}`);
        // 先檢查資料庫內是否有此單字
        const docCheck = await getDoc(docEnglish);
        if (docCheck.exists()) {
            return res
                .status(400)
                .json({ status: "error", message: "已有此單字" });
        }
        // 沒有的話，新增單字
        await setDoc(docEnglish, {
            english: english,
            chinese: chinese,
        });
        return res.status(200).json({ status: "success", message: "新增成功" });
    } catch (err) {
        console.error("錯誤", err);
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});
// 更新單字
apiRouter.put("/english", async (req, res) => {
    try {
        const { english, chinese } = req.body;
        const docEnglish = doc(db, `users/test/vocab/${english}`);
        await updateDoc(docEnglish, {
            chinese: chinese,
        });
        return res.status(200).json({ status: "success", message: "更新成功" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});
// 刪除單字
apiRouter.delete("/english", async (req, res) => {
    try {
        const { english } = req.body;
        const userAccount = req.headers["x-user-account"];
        const docEnglish = doc(db, `users/${userAccount}/vocab/${english}`);
        await deleteDoc(docEnglish);
        return res.status(200).json({ status: "success", message: "刪除成功" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

// 加入/取消收藏
apiRouter.put("/important", async (req, res) => {
    try {
        const { english } = req.body;
        const userAccount = req.headers["x-user-account"];
        const docEnglish = doc(db, `users/${userAccount}/vocab/${english}`);
        const docCheck = await getDoc(docEnglish);
        if (docCheck.data().important) {
            await updateDoc(docEnglish, {
                important: false,
            });
            return res
                .status(200)
                .json({ status: "success", message: "取消收藏成功" });
        }
        await updateDoc(docEnglish, {
            important: true,
        });
        return res
            .status(200)
            .json({ status: "success", message: "加入收藏成功" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

// 註冊
apiRouter.post("/member/signup", async (req, res) => {
    try {
        const { email, name } = req.body;
        if (email === "" || name === "") {
            return res
                .status(400)
                .json({ status: "error", message: "欄位不得為空白" });
        }
        if (!verifyName(name)) {
            return res
                .status(400)
                .json({ status: "error", message: "不得包含空白與特殊符號" });
        }
        if (!verifyEmail(email)) {
            return res
                .status(400)
                .json({ status: "error", message: "請輸入正確信箱格式" });
        }
        const docMember = doc(db, `users/${email}`);
        const docCheck = await getDoc(docMember);
        if (docCheck.exists()) {
            return res
                .status(400)
                .json({ status: "error", message: "帳號已存在" });
        }
        await setDoc(docMember, {
            email: email,
            name: name,
        });
        return res
            .status(200)
            .json({ status: "success", message: "註冊成功，頁面即將導向" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

// 登入
apiRouter.post("/member/login", async (req, res) => {
    try {
        const { email, name } = req.body;
        if (email === "" || name === "") {
            return res
                .status(400)
                .json({ status: "error", message: "欄位不得為空白" });
        }
        if (!verifyName(name) || !verifyEmail(email)) {
            return res
                .status(400)
                .json({ status: "error", message: "信箱或暱稱錯誤" });
        }
        const docMember = doc(db, `users/${email}`);
        //
        const docCheck = await getDoc(docMember);
        if (docCheck.exists()) {
            if (
                docCheck.data().name === name &&
                docCheck.data().email === email
            )
                return res.status(200).json({
                    status: "success",
                    message: "登入成功，頁面即將導向",
                });
        }
        return res
            .status(400)
            .json({ status: "error", message: "信箱或暱稱錯誤" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

app.use("/api", apiRouter);

export const api = onRequest(app);
