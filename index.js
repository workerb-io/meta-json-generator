const { validateSchema } = require("webpack");
const schema =  require("./options.json");

/**
 * getFileScripts function will return the script object of the file for meta json file
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
 * getFolderScripts function will return the script object of the folder for meta json file
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
 * getMetaScripts function will return complete script array including all files and 
 * folders information
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
 * @param {string} icon URL of the icon to be used
 * 
 * @return {string}
 * 
 */
function getMetaJsonContent(dirFiles, dirFolders, dirName, dirDesc, icon, sites) {
	let scriptsContent = getMetaScripts(dirFiles, dirFolders);
	let content = `{
		"name": "${dirName}",
		"description": "${dirDesc}",`;
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
 * (path : where to create the meta.json file, content: content of meta.json file)
 * This function uses the concept of recursion to explore all the inner folders.
 * 
 * @param {object} dirObject Object conatining all the info of directories anad files
 * @param {string} dirName Directory Name to explore
 * @param {Array<object>} completeMetaJsonInfo Array to be updated with meta json files information
 * 
 * dirObject = { files: [Array<string>], folders: {folderName: <object>}, parentPath: "/", description: string }
 * 
 * completeMetaJsonInfo = [{path: 'meta.json path', content: 'meta.json file content'}]
 * 
 * @return {Array<object>}  Array of meta.json file data (location, file content)
 */
function generateMetaJson(dirObject, dirName) {
	let completeMetaJsonInfo = [];
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
	let metaJsonContent = getMetaJsonContent(fileObjects, folderObjects, dirName, dirDesc, icon, sites);
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
 * having all the informatin of internal files, folders and their description
 * 
 * @param {object} compilationAssestsObject compilation.assets object of webpack
 * @param {string} packageDescription description of the package
 * @param {string} packageIcon Icon URL for package
 * @param {string} folderIcon Icon URL for all folders inside the package
 * @param {Array} sites Array of package sites
 * @param {string} folderDescription description of the folder
 * @param {string} environment webpack mode in which it is executed
 * 
 * @return {object}
 * 
 */
function generateDirectoryObject(compilationAssestsObject, packageDescription, packageIcon, folderIcon, sites, folderDescription, environment) {
	var directoryObject = {
		files: [],
		folders: {},
		parentPath: "/",
		description: packageDescription,
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
		let visitedPaths = [''];  // to build visited complete path and check if its description in available 
		while(path.length > 0) {
			let folderDesc = "";
			let folder = path.shift();
			let parent = directory.parentPath;
			directory = directory.folders;
			visitedPaths.push(folder);
			if(!directory[folder]) {
				let joinedPath = visitedPaths.join("/");  // building the visited path and checking if the description is available
				if(folderDescription && folderDescription[joinedPath]) {
					folderDesc = folderDescription[joinedPath];
				}
				directory[folder] = {
					files: [],
					folders: {},
					parentPath: `${parent}${folder}/`,
					description: folderDesc,
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
	if(fileName.includes(".json")) {
		return false;
	}
	let content = compilationAssestsObject[fileName].source();
	let ignoreContent = content.split("\n").filter(line => line.includes("@ignore"));
	return ignoreContent.length === 0;
}

/**
 * getFileDescription function extracts the description from file content
 * based on the enviroment (development | production)
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
		this.folderIcon = options.folderIcon;
		this.sites = options.sites;
		this.folderDescriptionList = options.folderDescriptionList;
		this.folderDescription = {};
		if(this.folderDescriptionList) {
			this.folderDescriptionList.forEach(folder => {
				this.folderDescription[folder.path] = folder.description
			});
		}
	}

	apply(compiler) {
	  // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
	  compiler.hooks.emit.tapAsync('WBMetaJsonGeneratorPlugin', (compilation, callback) => {
		// Loop through all compiled assets,
		// adding a new line item for each filename.

		var directoryObject = generateDirectoryObject(compilation.assets, this.packageDescription, this.packageIcon,
			this.folderIcon, this.sites, this.folderDescription, this.environment);

		var completeMetaJsonInfo = generateMetaJson(directoryObject, this.package);

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
		  
		callback();
	  });
	}
  }
  
  module.exports = WBMetaJsonGeneratorPlugin;