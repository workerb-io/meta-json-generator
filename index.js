const { validateSchema } = require("webpack");
const schema =  require("./options.json");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

/**
 * getFileScripts function will return the script object of the
 * file for the meta json file
 * 
 * @param {object} fileObject: Object having name and description info of file
 * fileObject => {file: "setup.js", description: "Setup the user"}
 * 
 * @return {string}
 *  
 */
function getFileScripts(fileObject) {
	let fileWithoutExt = fileObject.fileName.replace(/\.[^/.]+$/, "");
	return `{
	  "name": "${fileWithoutExt}",
	  "file": "${fileObject.fileName}",
	  "type": "action",
	  "description": "${fileObject.description}"
	}`;
}

/**
 * getFolderScripts function will return the script object of
 * the folder for the meta json file
 * @param {object} folderObject Object having name and description info of the folder
 * 
 * folderObject => {folderName: "setup.js", description: "Setup the user"}
 * 
 * @return {string}
 */  
function getFolderScripts(folderObject) {
	return `{
	  "name": "${folderObject.folderName}",
	  "file": "${folderObject.folderName}",
	  "type": "folder",
	  "description": "${folderObject.description}"
	}`;
}

/**
 * getMetaScripts function will return a complete script array
 * including all files and folders information
 * 
 * @param {Array<object>} dirFiles Array of file objects [{file: string, description: string}]
 * @param {Array<object>} dirFolders Array of folder objects [{folderName: string, description: string}]
 * 
 * @return {string}
 */
function getMetaScripts(dirFiles = [], dirFolders = []) {
	let scripts = [];
	dirFiles
	.filter(fileObject => !fileObject.fileName.includes('.json'))
	.forEach(fileObject => {
	  scripts.push(getFileScripts(fileObject));
	});
	dirFolders.forEach(folderObject => {
	  scripts.push(getFolderScripts(folderObject));
	});
	let scriptContent = `[`;
	scripts.forEach(script => {
	  scriptContent += script + ',';
	});
	scriptContent = scriptContent.slice(0, -1); // removing ',' from the last item
	scriptContent += ']';
	return scriptContent;
}

/**
 * getMetaJsonContent function will return complete meta json content to write into the file
 * 
 * @param {Array<object>} dirFiles Array of file objects [{file: string, description: string}]
 * @param {Array<object>} dirFolders Array of folder objects [{folderName: string, description: string}]
 * @param {string} dirName Parent folder name
 * @param {string} dirDesc Parent folder description
 * @param {string} defaultAction Folder default action to be executed
 * @param {string} icon URL of the icon to be used
 * 
 * @return {string}
 * 
 */
function getMetaJsonContent(dirFiles, dirFolders, dirName, dirDesc, defaultAction, icon, sites) {
	let scriptsContent = getMetaScripts(dirFiles, dirFolders);
	let content = `{
		"name": "${dirName}",
		"description": "${dirDesc}",
		"defaultAction": "${defaultAction}",`;
	if (icon) {
		content = `${content}
		"icon": "${icon}",`;
	}
	return `${content}
		"scripts": ${scriptsContent}
	}`;
}

/**
 * generateMetaJson function will return completeMetaJsonInfo Array with meta json file info
 * (path: where to create the meta.json file, content: the content of meta.json file)
 * This function uses the concept of recursion to explore all the inner folders.
 * 
 * @param {object} dirObject Object containing all the info of directories anad files
 * @param {string} dirName Directory Name to explore
 * @param {Array<object>} completeMetaJsonInfo Array to be updated with meta json files information
 * 
 * dirObject = { 
 * 		files: [Array<string>], 
 * 		folders: {folderName: <object>}, 
 * 		parentPath: "/", 
 * 		description: string,
 * 		defaultAction: "",
 *		icon: packageIcon,
 *		sites: sites
 * }
 * 
 * completeMetaJsonInfo = [{path: 'meta.json path', content: 'meta.json file content'}]
 * 
 * @return {Array<object>}  Array of meta.json file data (location, file content)
 */
function generateMetaJson(dirObject, dirName) {
	let completeMetaJsonInfo = [];
	// terminating condition for recursive function
	if(!dirObject.files && !dirObject.folders) {
		return completeMetaJsonInfo;
	}
	let folderObjects = Object.keys(dirObject.folders).map(folderName => {
		return {
			folderName,
			description: dirObject.folders[folderName]["description"]
		}
	});
	let fileObjects = dirObject.files;
	let path = dirObject.parentPath;
	let dirDesc = dirObject.description;
	let icon = dirObject.icon;
	let sites = dirObject.sites;
	let defaultAction = dirObject.defaultAction;
	let metaJsonContent = getMetaJsonContent(fileObjects, folderObjects, dirName, dirDesc, defaultAction, icon, sites);
	let metaJsonObject = {
		path,
		content: metaJsonContent
	}
	completeMetaJsonInfo.push(metaJsonObject);
	while(folderObjects.length > 0) {
		let currentFolderObject = folderObjects.pop();
		let metaInfo = generateMetaJson(dirObject.folders[currentFolderObject.folderName], currentFolderObject.folderName);
		completeMetaJsonInfo = [...completeMetaJsonInfo, ...metaInfo];
	}
	return completeMetaJsonInfo;
}

/**
 * generateDirectoryObject function will build and return the complete directory object
 * having all the information of internal files, folders, and their description
 * 
 * @param {object} compilationAssestsObject compilation.assets object of webpack
 * @param {string} packageDescription description of the package
 * @param {string} packageIcon Icon URL for package
 * @param {string} folderIcon Icon URL for all folders inside the package
 * @param {Array} sites Array of package sites
 * @param {object} folderInfo object having folder information (path, description, iconPath)
 * @param {string} environment webpack mode in which it is executed
 * 
 * @return {object}
 * 
 */
function generateDirectoryObject(compilationAssestsObject, packageDescription, packageIcon, sites, folderInfo, environment) {
	var directoryObject = {
		files: [],
		folders: {},
		parentPath: "/",
		description: packageDescription,
		defaultAction: "",
		icon: packageIcon,
		sites: sites
	};

	for (var filename in compilationAssestsObject) {

		if(!isValidFile(compilationAssestsObject, filename)) {
			continue;
		}
		let content = compilationAssestsObject[filename].source();
		let fileDesc = getFileDescription(content, environment);
		let directory = directoryObject;
		let path = filename.split("/");
		let file = path.pop();
		if(path.length > 0 && path[0] === '') {
			path.shift();
		}
		let visitedPaths = [''];  // to build visited complete path and check if its description is available 
		while(path.length > 0) {
			let folderDesc = "";
			let folderIcon = "";
			let folderDefaultAction = "";
			let folder = path.shift();
			let parent = directory.parentPath;
			directory = directory.folders;
			visitedPaths.push(folder);
			if(!directory[folder]) {
				let joinedPath = visitedPaths.join("/");  // building the visited path and checking if the description is available
				if(folderInfo && folderInfo[joinedPath]) {
					folderDefaultAction = folderInfo[joinedPath]["defaultAction"];
					folderDesc = folderInfo[joinedPath]["description"];
					folderIcon = folderInfo[joinedPath]["distIconPath"];
				}
				directory[folder] = {
					files: [],
					folders: {},
					parentPath: `${parent}${folder}/`,
					description: folderDesc,
					defaultAction: folderDefaultAction ? folderDefaultAction : "",
					icon: folderIcon
				}
			}
			directory = directory[folder];
		}
		if(directory && directory.files) {
			directory.files.push({
				fileName: file,
				description: fileDesc
			});
		}
	}
	return directoryObject;
}

/**
 * isValidFile function checks whether the file and content is valid or not to be added 
 * in meta.json file
 * Validity measures - 
 * should not be a .json file and should not include @ignore in the comments of the script 
 * 
 * @param {object} compilationAssestsObject compilation.assets object of webpack
 * @param {string} fileName 
 * 
 * @return {boolean}
 */
function isValidFile(compilationAssestsObject, fileName) {
	const invalidFilesRegex = /\.(gif|svg|jpe?g|png|PNG|json)$/
	if(invalidFilesRegex.test(fileName)) {
		return false;
	}
	let content = compilationAssestsObject[fileName].source();
	let ignoreContent = content.split("\n").filter(line => line.includes("@ignore"));
	return ignoreContent.length === 0;
}

/**
 * getFileDescription function extracts the description from file content
 * based on the environment (development | production)
 * 
 * @param {string} fileContent : Content of minified file from webpack
 * @param {string} environment: webpack mode in which is executed
 * 
 * @return {string}
 */
function getFileDescription(fileContent, environment) {
	let description = "";
	let descriptionComment = fileContent.split("\n").filter(line => line.includes("@description"));
	if(environment === "production") {
		description = descriptionComment.length > 0 ? descriptionComment[0].split("@description").pop() : "";
	} else {
		if(descriptionComment.length > 0) {
			let descriptionToken = descriptionComment[0].split("\\n").filter(token => token.includes("@description")).map(val => val.replace("\\r", ""));
			description = descriptionToken.length > 0 ? descriptionToken[0].split("@description").pop() : "";
		}
	}
	return description.trim();
}

/**
 * getLocalIconData funciton extracts the actual contents of the icon file
 * and generates the updated path of the icon w.r.t. dist folder and adds
 * UUID with each file name.
 * 
 * @param {string} compilerContext it is the webpacks compiler.context string which has
 * the info of absolute path of the root directory
 * @param {string} relativeIconPath relative path of the icon
 * 
 * @returns {object} an object containing icon path w.r.t. dist/ folder
 * example: {
 * path: "icon path relative to dist/ folder"
 * content: "BUFFER conatining actual content of icon file"
 * }
 */
function getLocalIconData(compilerContext, relativeIconPath) {
	const absoluteIconPath = `${compilerContext}/${relativeIconPath}`;
	const fileContents = fs.readFileSync(absoluteIconPath);
	// get an array of icon name and extension to append UUID
	const iconFile = relativeIconPath.split("/").slice(-1).pop().split("."); // ["icon", "ext"]
	const iconFileName = iconFile[0] + '-' + uuidv4() + `.${iconFile[1]}`
	const writePath = `icons/${iconFileName}`;
	return {
		path: writePath,
		content: fileContents
	};
}

/**
 * getFolderIconsInfo function will return information of all local icons that 
 * are mentioned in folderDescriptionList and update the respective iconPath
 * w.r.t. dist directory 
 * @param {Array<object>} folderDescriptionList Array of folder descriptors object
 * example: {
 * 	path: relative path to the folder w.r.t. src/actions
 * 	description: folder description
 * 	iconPath: path of icon images used for folder w.r.t. root directory
 * }
 * @param {string} compilerContext it is the webpack's compiler.context string which has
 * the info of absolute path of the root directory
 * 
 * @returns {Array<object>} this function will return array of folder icon objects
 * whose structure looks like this:
 * [
 * 	{
 * 		path: the path of the icon relative to the dist directory
 * 		content: icon images raw contents
 * 	}
 * ]
 */
function getFolderIconsInfo(folderDescriptionList, compilerContext) {
	const folderIconData = [];
	const httpUrlRegex = /(http(s?)):\/\//i;  // to ignore the http | https icon urls
	folderDescriptionList
	.filter(folder => folder.iconPath && !httpUrlRegex.test(folder.iconPath))
	.forEach(folderData => {
		const iconDataObject = getLocalIconData(compilerContext, folderData.iconPath);
		// add dist icon path for meta.json file w.r.t. dist directory
		folderData["distIconPath"] = iconDataObject.path;
		folderIconData.push(iconDataObject);
	});
	return folderIconData;
}

class WBMetaJsonGeneratorPlugin {

	constructor(options = {}) {
		validateSchema(schema, options, {
			name: "WB MetaJson Generator",
			baseDataPath: "options"
		});
		this.defaultEnv = "production";
		this.environment = options.environment || this.defaultEnv;
		this.package = options.package;
		this.packageDescription = options.packageDescription;
		this.packageIcon = options.packageIcon;
		this.readmeFile = options.readmeFile;
		this.sites = options.sites;
		this.folderDescriptionList = options.folderDescriptionList;
	}

	apply(compiler) {
	  // emit is an asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
	  compiler.hooks.emit.tapAsync('WBMetaJsonGeneratorPlugin', (compilation, callback) => {
		// Loop through all compiled assets,
		// adding a new line item for each filename.

		let localIconInfo = [];

		let folderInfo = {};

		let distPackageIcon = this.packageIcon;

		if(this.folderDescriptionList) {
			// get all folder icons info (path of icon file, the content of icon file)
			localIconInfo = getFolderIconsInfo(this.folderDescriptionList, compiler.context);

			// creating folder info object with the path of a folder as property for faster lookup
			this.folderDescriptionList.forEach(folder => {
				folderInfo[folder.path] = folder;
			});
		}

		// check if the package icon is remote URL or a local one
		// if it is local then we copy the content of the icon file and update
		// the distPackageIcon path w.r.t. dist/icons directory
		const httpUrlRegex = /(http(s?)):\/\//i;  // to ignore the http | https icon urls
		if(distPackageIcon && !httpUrlRegex.test(distPackageIcon)) {
			const iconDataObject = getLocalIconData(compiler.context, this.packageIcon);
			// update icon path for meta.json file w.r.t. dist directory
			distPackageIcon = iconDataObject.path;
			localIconInfo.push(iconDataObject); 
		}

		var directoryObject = generateDirectoryObject(compilation.assets, this.packageDescription, distPackageIcon,
			 this.sites, folderInfo, this.environment);

		// get all meta.json files info (path: where to create, content: meta.json content)
		var completeMetaJsonInfo = generateMetaJson(directoryObject, this.package);

		// writing meta.json files in their respective locations in the dist folder
		completeMetaJsonInfo.forEach(metaInfo => {
			compilation.assets[`${metaInfo.path}/meta.json`] = {
				source: function() {
					return metaInfo.content;
				},
				size: function() {
					return metaInfo.content.length;
				},
			};
		});

		// before copying the icon files make sure there should not be any 
		// existing image files in the dist folder if there is then delete
		// because icon name will always be unique and whenever
		// the build happens icon files will be accumulating
		const distIconsDirPath = `${compiler.context}/dist/icons`;
		if(fs.existsSync(distIconsDirPath)) {
			fs.rmdirSync(distIconsDirPath, {recursive: true});
		}

		// copying file content in their respective predefined location
		// dist/icons/ directory
		localIconInfo.forEach(folderIcon => {
			compilation.assets[`${folderIcon.path}`] = {
				source: function() {
					return folderIcon.content;
				},
				size: function() {
					return folderIcon.content.size;
				}
			}
		});

		// Check if the readme file path exists or not and if the path is
		// there read the contents of the README.md file that the user has 
		// passed and copy the contents to dist/ folder with
		// filename as "README.md"
		if(this.readmeFile) {
			const absoluteReadmePath = `${compiler.context}/${this.readmeFile}`;
			const readmeContent = fs.readFileSync(absoluteReadmePath);
			compilation.assets['/README.md'] = {
				source: function() {
					return readmeContent;
				},
				size: function() {
					return readmeContent.length;
				},
			};
		}
		  
		callback();
	  });
	}
  }
  
  module.exports = WBMetaJsonGeneratorPlugin;