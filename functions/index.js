import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import "dotenv/config";

// 初始化firebase
const firebaseApp = initializeApp({
    credential: applicationDefault(),
});

// 初始化firestore
const db = getFirestore(firebaseApp);
const app = express();
const port = process.env.PORT || 8080;

//設置cors
//允許的來源
const allowedOrigins = [
    "http://localhost:5173",
    "https://learn-english-react.vercel.app",
];
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
app.use(cors(corsOptions));
app.use(express.json());

const apiRouter = express.Router();

// 驗證函數（保持不變）
function verifyChinese(text) {
    const regex = /^[\u4e00-\u9fa5\s、]+$/;
    return regex.test(text);
}

function verifyEnglish(text) {
    const regex = /^[a-zA-Z]+$/;
    return regex.test(text);
}

function verifyName(text) {
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9]*$/;
    return regex.test(text);
}

function verifyEmail(text) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(text);
}

//取得所有單字
apiRouter.get("/english-list", async (req, res) => {
    try {
        const userAccount = req.headers["x-user-account"];
        const snapshot = await db
            .collection(`users/${userAccount}/vocab`)
            .get();
        const englishList = snapshot.docs.map((doc) => doc.data());
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
        const snapshot = await db
            .collection(`users/${userAccount}/vocab`)
            .where("important", "==", true)
            .get();
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
        const docSnap = await db
            .doc(`users/${userAccount}/vocab/${english}`)
            .get();
        if (docSnap.exists) {
            return res.status(200).json({
                status: "success",
                message: docSnap.data(),
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
        const snapshot = await db
            .collection(`users/${userAccount}/vocab`)
            .where("important", "==", true)
            .where("english", "==", english)
            .get();
        if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
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
                message: "請輸入正確中文格式 (可已空白或頓號分隔)",
            });
        }
        const docRef = db.doc(`users/${userAccount}/vocab/${english}`);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return res
                .status(400)
                .json({ status: "error", message: "已有此單字" });
        }
        await docRef.set({
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
        const userAccount = req.headers["x-user-account"];
        await db.doc(`users/${userAccount}/vocab/${english}`).update({
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
        await db.doc(`users/${userAccount}/vocab/${english}`).delete();
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
        const docRef = db.doc(`users/${userAccount}/vocab/${english}`);
        const docSnap = await docRef.get();
        if (docSnap.data().important) {
            await docRef.update({
                important: false,
            });
            return res
                .status(200)
                .json({ status: "success", message: "取消收藏成功" });
        }
        await docRef.update({
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
        const docRef = db.doc(`users/${email}`);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return res
                .status(400)
                .json({ status: "error", message: "帳號已存在" });
        }
        await docRef.set({
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
        const docSnap = await db.doc(`users/${email}`).get();
        if (docSnap.exists) {
            const userData = docSnap.data();
            if (userData.name === name && userData.email === email) {
                return res.status(200).json({
                    status: "success",
                    message: "登入成功，頁面即將導向",
                });
            }
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
