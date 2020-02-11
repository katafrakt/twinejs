/*
Manages reading and writing JSON files to the application data folder. This
listens to the `save-json` IPC event.
*/

import {app, ipcMain} from 'electron';

import fs from 'fs-extra';
import path from 'path';

const JsonFile = {
	/*
	Returns a promise resolving to the contents of a JSON file in the app data
	folder. The promise rejects if there are any problems reading the file,
	including if the file does not exist.
	*/

	load(filename) {
		return fs.readJson(path.join(app.getPath('userData'), filename));
	},

	/*
	Saves an object to JSON in the app data folder. Returns a promise when done.
	*/

	save(filename, data) {
		return fs.writeJson(path.join(app.getPath('userData'), filename), data);
	}
};

export const load = JsonFile.load;
export const save = JsonFile.save;
export default JsonFile;

ipcMain.on('save-json', (e, filename, data) => {
	JsonFile.save(filename, data);
});
