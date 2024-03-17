"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdown = void 0;
const fs = require("fs/promises");
const https = require("https");
// import * as stream from "stream";
// import * as util from "util";
const crypto = require("crypto");
// const pipeline = util.promisify(stream.pipeline);
function request(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            if (res.headers.location) {
                const url = new URL(res.headers.location);
                resolve(request({
                    method: "GET",
                    hostname: url.hostname,
                    path: url.pathname + url.search,
                }));
            }
            else {
                resolve(res);
            }
        });
        req.on("error", error => {
            reject(error);
        });
        req.end();
    });
}
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const data = [];
        stream.on("data", chunk => {
            data.push(chunk);
        });
        stream.on("end", () => {
            resolve(Buffer.concat(data));
        });
        stream.on("error", error => {
            reject(error);
        });
    });
}
function getMd5Hash(data) {
    return crypto.createHash("md5").update(data).digest("hex").toLowerCase();
}
// super primitive lol but works for now
function gdown(id, savePath, md5) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = new URL("https://drive.google.com/uc?id=" + id);
        const res = yield request({
            method: "GET",
            hostname: url.hostname,
            path: url.pathname + url.search,
        });
        const downloadable = res.headers["content-disposition"] != null;
        const writeFile = (resToWrite) => __awaiter(this, void 0, void 0, function* () {
            // const fh = await fs.open(savePath, "w+");
            // await pipeline(resToWrite, fh.createWriteStream());
            // fh.close();
            const buffer = yield streamToBuffer(resToWrite);
            if (md5 != null && getMd5Hash(buffer) != md5.trim().toLowerCase()) {
                throw new Error("Invalid md5 checksum");
            }
            yield fs.writeFile(savePath, buffer);
        });
        if (downloadable) {
            yield writeFile(res);
        }
        else {
            const html = (yield streamToBuffer(res)).toString("utf8");
            const urlMatches = html.match(/action="([^]+?\/uc\?id=[^]+?)"/i);
            if (urlMatches == null)
                throw new Error("Failed to download gdrive link");
            const actualUrl = new URL(urlMatches[1].replace(/&amp;/g, "&"));
            const actualRes = yield request({
                method: "POST",
                hostname: actualUrl.hostname,
                path: actualUrl.pathname + actualUrl.search,
            });
            const actualDownloadable = actualRes.headers["content-disposition"] != null;
            if (!actualDownloadable)
                throw new Error("Failed to download gdrive link");
            yield writeFile(actualRes);
        }
    });
}
exports.gdown = gdown;
