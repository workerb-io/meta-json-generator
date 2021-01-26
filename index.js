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
 * 
 * @return {string}
 * 
 */
function getMetaJsonContent(dirFiles, dirFolders, dirName) {
	let scriptsContent = getMetaScripts(dirFiles, dirFolders);
	return `{
	  "name": "${dirName}",
	  "description": "",
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
	let metaJsonContent = getMetaJsonContent(fileObjects, folderObjects, dirName);
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
 * @param {string} folderDescription description of the folder
 * 
 * @return {object}
 * 
 */
function generateDirectoryObject(compilationAssestsObject, packageDescription, folderDescription) {
	var directoryObject = {
		files: [],
		folders: {},
		parentPath: "/",
		description: packageDescription
	};
			  
	for (var filename in compilationAssestsObject) {
		if(!isValidFile(compilationAssestsObject, filename)) {
			continue;
		}
		let folderDesc = "";
		let content = compilationAssestsObject[filename].source();
		let fileDesc = getFileDescription(content);
		let directory = directoryObject;
		let path = filename.split("/");
		let file = path.pop();
		let joinedPath = path.join("/");
		if(folderDescription && folderDescription[joinedPath]) {
			folderDesc = folderDescription[joinedPath];
		}
		if(path.length > 0 && path[0] === '') {
			path.shift();
		}
		while(path.length > 0) {
			let folder = path.shift();
			let parent = directory.parentPath;
			directory = directory.folders;
			if(!directory[folder]) {
				directory[folder] = {
					files: [],
					folders: {},
					parentPath: `${parent}${folder}/`,
					description: folderDesc
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
 * @param {string} fileContent : Content of minified file from webpack
 * 
 * @return {string}
 */
function getFileDescription(fileContent) {
	let descriptionComment = fileContent.split("\n").filter(line => line.includes("@description"));
	let description = descriptionComment.length > 0 ? descriptionComment[0].split("@description").pop() : "";
	return description.trim();
}

/**
 * camelToTitle function converts any camelcase string to title case
 * @param {string} camelCase
 * 
 * Example: boardMembers => Board Members
 * 
 * @return {string}
 */
const camel2title = (camelCase = "") => camelCase
  .replace(/([A-Z])/g, (match) => ` ${match}`)
  .replace(/^./, (match) => match.toUpperCase());

class WBMetaJsonGeneratorPlugin {

	constructor(options = {}) {
		validateSchema(schema, options, {
			name: "WB MetaJson Generator",
			baseDataPath: "options"
		});
		this.package = options.package;
		this.folderDescription = options.folderDescription;
		this.packageDescription = options.packageDescription;
	}

	apply(compiler) {
	  // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
	  compiler.hooks.emit.tapAsync('WBMetaJsonGeneratorPlugin', (compilation, callback) => {
  
		// Loop through all compiled assets,
		// adding a new line item for each filename.

		var directoryObject = generateDirectoryObject(compilation.assets, this.packageDescription, this.folderDescription);

		var completeMetaJsonInfo = generateMetaJson(directoryObject, this.package, completeMetaJsonInfo);

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