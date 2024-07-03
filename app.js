import express from "express";
import cors from "cors";
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
const firebaseConfig = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID,
};

// 初始化firebase
const firebaseApp = initializeApp(firebaseConfig);

// 初始化firestore
const db = getFirestore(firebaseApp);
const app = express();
const port = 3000;

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

//取得所有單字
apiRouter.get("/english-list", async (req, res) => {
    try {
        const docEnglishes = collection(db, "users/test/vocab");
        const snapshot = await getDocs(docEnglishes);
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
        const { english } = req.body;
        const docEnglish = doc(db, `users/test/vocab/${english}`);
        const docCheck = await getDoc(docEnglish);
        if (docCheck.exists()) {
            return res.status(200).json({
                status: "success",
                message: docCheck.data(),
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
        if (english === "" || chinese === "") {
            return res
                .status(400)
                .json({ status: "error", message: "輸入欄位不得為空" });
        }
        const docEnglish = doc(db, `users/test/vocab/${english}`);
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
        const docEnglish = doc(db, `users/test/vocab/${english}`);
        await deleteDoc(docEnglish);
        return res.status(200).json({ status: "success", message: "刪除成功" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "伺服器錯誤" });
    }
});

app.use("/api", apiRouter);

app.listen(port, () => {
    console.log(`伺服器啟動於 http://localhost:${port}`);
});
