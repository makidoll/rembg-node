import axios from "axios";
import * as fs from "fs/promises";
import * as stream from "stream";
import * as util from "util";

const pipeline = util.promisify(stream.pipeline);

function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
	return new Promise((resolve, reject) => {
		const data = [];
		stream.on("data", chunk => {
			data.push(chunk);
		});
		stream.on("end", () => {
			resolve(Buffer.concat(data).toString("utf8"));
		});
		stream.on("error", error => {
			reject(error);
		});
	});
}

// super primitive lol but works (for now)
export async function gdown(id: string, savePath: string) {
	const url = "https://drive.google.com/uc?id=" + id;

	const res = await axios({ url, responseType: "stream" });

	const downloadable = res.headers["content-disposition"] != null;

	let fh: fs.FileHandle;
	try {
		if (downloadable) {
			fh = await fs.open(savePath, "w+");
			await pipeline(res.data, fh.createWriteStream());
		} else {
			// aa fuck intermediary page
			const html = await streamToString(res.data);

			const urlMatches = html.match(/action="([^]+?\/uc\?id=[^]+?)"/i);
			if (urlMatches == null)
				throw new Error("Failed to download gdrive link");

			const actualRes = await axios({
				method: "post",
				url: urlMatches[1].replace(/&amp;/g, "&"),
				responseType: "stream",
			});

			const actualDownloadable =
				actualRes.headers["content-disposition"] != null;

			if (!actualDownloadable)
				throw new Error("Failed to download gdrive link");

			fh = await fs.open(savePath, "w+");
			await pipeline(actualRes.data, fh.createWriteStream());
		}
	} finally {
		if (fh) fh.close();
	}
}
