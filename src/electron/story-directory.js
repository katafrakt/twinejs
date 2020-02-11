import {app, shell} from 'electron';
import fs from 'fs-extra';
import klaw from 'klaw-sync';
import {say} from '../locale';
import mkdirp from 'mkdirp-promise';
import _path from 'path';

const StoryDirectory = {
	/*
	Returns the full path of the user's story directory.
	*/

	path() {
		return _path.join(app.getPath('documents'), say('Twine'), say('Stories'));
	},

	/*
	Creates the stories directory, if it doesn't already exist. If it does
	exist, this does nothing. In either case, it returns a promise that resolves
	once done.
	*/

	create() {
		return mkdirp(StoryDirectory.path());
	},

	/*
	Locks the story directory, preventing user tampering (and confusing the
	app). This returns a promise that resolves when done.
	*/

	lock() {
		const storyPath = StoryDirectory.path();

		if (process.platform == 'win32') {
			/* On Windows, we must lock each file individually. */

			return fs.readdir(storyPath).then(files => {
				return Promise.all(
					/* a-w, 0444 */
					files.map(f => fs.chmod(path.join(storyPath, f), 292))
				);
			});
		} else {
			/* Everywhere else, locking the directory is good enough. */

			return fs.stat(storyPath).then(stats =>
				/* u-w */
				fs.chmod(storyPath, stats.mode ^ 128)
			);
		}
	},

	/*
	Unlocks the story directory. This returns a promise that resolves when done.
	*/

	unlock() {
		const storyPath = StoryDirectory.path();

		if (process.platform == 'win32') {
			/* On Windows, we must lock each file individually. */

			return fs.readdir(storyPath).then(files => {
				return Promise.all(
					/* a+w, 0666 */
					files.map(f => fs.chmod(_path.join(storyPath, f), 438))
				);
			});
		} else {
			/* Everywhere else, locking the directory is good enough. */

			return fs.stat(storyPath).then(stats =>
				/* u-w */
				fs.chmod(storyPath, stats.mode | 128)
			);
		}
	},

	/*
	Shows the story directory in the user's file browser.
	*/

	reveal() {
		shell.openItem(StoryDirectory.path());
	},

	/*
	Creates a backup of the entire story directory.
	*/

	backup(maxBackups = 10) {
		// eslint-disable-next-line no-console
		console.log('Backing up story library');

		const backupPath = _path.join(
			app.getPath('documents'),
			say('Twine'),
			say('Backups')
		);
		const now = new Date();

		return fs
			.copy(
				StoryDirectory.path(),
				_path.join(
					backupPath,
					`${now.getFullYear()}-${now.getMonth() +
						1}-${now.getDate()} ${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`
				)
			)
			.then(() => {
				const backups = klaw(backupPath, {
					depthLimit: 0,
					filter(file) {
						return path.basename(file.path)[0] !== '.';
					},
					nofile: true
				}).sort((a, b) => {
					if (a.stats.mTimeMs < b.stats.mTimeMs) {
						return -1;
					}

					if (a.stats.mTimeMs > b.stats.mTimeMs) {
						return 1;
					}

					return 0;
				});

				if (backups.length > maxBackups) {
					// eslint-disable-next-line no-console
					console.log(
						`There are ${backups.length} story library backups, pruning`
					);

					const toDelete = backups.slice(0, backups.length - maxBackups);

					return Promise.all(toDelete.map(file => fs.remove(file.path)));
				}
			});
	}
};

export const unlock = StoryDirectory.unlock;
export const backup = StoryDirectory.backup;
export const lock = StoryDirectory.lock;
export const create = StoryDirectory.create;
export const path = StoryDirectory.path;
export default StoryDirectory;
