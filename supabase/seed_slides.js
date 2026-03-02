"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv = __importStar(require("dotenv"));
var path_1 = require("path");
// .env.local などを読み込む必要がある場合
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../.env.local') });
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key is missing from environment variables.");
    process.exit(1);
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
function seedSlides() {
    return __awaiter(this, void 0, void 0, function () {
        var bucketName, prefix, _loop_1, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bucketName = 'learning-contents';
                    prefix = 'slides/';
                    _loop_1 = function (i) {
                        var moduleName, folderPath, _b, files, listError, imageFiles, imageUrls, title, rewardXp, dbError;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    moduleName = "module_".concat(i);
                                    folderPath = "".concat(prefix).concat(moduleName, "/");
                                    console.log("Checking folder: ".concat(folderPath));
                                    return [4 /*yield*/, supabase
                                            .storage
                                            .from(bucketName)
                                            .list(folderPath)];
                                case 1:
                                    _b = _c.sent(), files = _b.data, listError = _b.error;
                                    if (listError) {
                                        console.error("Error listing folder ".concat(folderPath, ":"), listError);
                                        return [2 /*return*/, "continue"];
                                    }
                                    imageFiles = (files === null || files === void 0 ? void 0 : files.filter(function (f) { return f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg'); })) || [];
                                    if (imageFiles.length === 0) {
                                        console.log("No images found in ".concat(folderPath, ". Skipping."));
                                        return [2 /*return*/, "continue"];
                                    }
                                    // 名前でソート (01.png, 02.png...)
                                    imageFiles.sort(function (a, b) { return a.name.localeCompare(b.name); });
                                    imageUrls = imageFiles.map(function (file) {
                                        var data = supabase.storage.from(bucketName).getPublicUrl("".concat(folderPath).concat(file.name)).data;
                                        return data.publicUrl;
                                    });
                                    console.log("Found ".concat(imageUrls.length, " images for ").concat(moduleName));
                                    title = "\u30B9\u30E9\u30A4\u30C9\u5B66\u7FD2 - \u6BB5\u968E".concat(i);
                                    rewardXp = 10;
                                    return [4 /*yield*/, supabase
                                            .from('learning_slides_modules')
                                            .upsert({
                                            id: "00000000-0000-0000-0000-00000000000".concat(i), // テスト用の固定UUID、実運用はランダム生成でも可
                                            title: title,
                                            description: "\u30EC\u30D9\u30EB".concat(i, "\u306E\u5B66\u7FD2\u30B9\u30E9\u30A4\u30C9\u3067\u3059"),
                                            order_index: i,
                                            image_urls: imageUrls,
                                            reward_xp: rewardXp,
                                            is_published: true
                                        }, { onConflict: 'id' })];
                                case 2:
                                    dbError = (_c.sent()).error;
                                    if (dbError) {
                                        console.error("Error saving to DB for ".concat(moduleName, ":"), dbError);
                                    }
                                    else {
                                        console.log("Successfully updated DB for ".concat(moduleName));
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 1;
                    _a.label = 1;
                case 1:
                    if (!(i <= 8)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(i)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
seedSlides().then(function () {
    console.log("Done.");
    process.exit(0);
});
