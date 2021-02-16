# wb-packager-webpack-plugin

This is a webpack plugin specially designed for workerB packages in order to create meta.json files dynamically. So that developer does not have to maintain it manually.

## How to add the plugin in a workerB package ?
```npm install --save-dev wb-packager-webpack-plugin```

_with yarn_
```yarn add wb-packager-webpack-plugin -D```

OR

_in package.json_
```
"devDependencies": {
    "wb-packager-webpack-plugin": "^1.0.0"
}
```
```yarn install```

OR 

```npm install```

## Prerequisites for the plugin
[uuid](https://www.npmjs.com/package/uuid) 
<br />

## How to use the plugin ?

_in webpack.config.js_ file

import the plugin

```const WBMetaJsonGenerator = require("wb-packager-webpack-plugin");```

```
module.exports = {
    plugins: [
        new WBMetaJsonGenerator({
            environment: "development",
            package: "<package name>",
            packageDescription: "<package descrition>",
            packageIcon: <package icon url(remote/local)>,
            folderDescriptionList: [
                { path: "/boards", description: "Display all the boards",
                iconPath: "path to folder icon"},
                { path: "/boards/option/lists", description: "Display all the lists of the board"}
            }
        })
    ]
}
```

## Parameter Explanation

### _environment_
- type: string
- value: current mode of webpack [`development` | `production`]
- based on environment the plugin will get the description

### _package_ 
- type: string
- value: name of the package
- usage: in root meta.json file name property

### _packageDescription_
- type: string
- value: description of the package
- usage: in root meta.json file description property

### _packageIcon_
- type: string
- value: icon/logo URL to display along the package name
- usage: in root meta.json icon property

### _folderIcon_
- type: string
- value: icon/logo URL to display alongside every folder in the package
- usage: in every meta.json icon property
### _folderDescriptionList_
- type: array
- value: an array of object having folder path/ description as key value pair

```
    [
        {   path: "/boards/option/lists",
            description: "Display all the lists of the board",
            iconPath: "/src/actions/icons/icon123.png" # optional
        }
    ]
```


**/boards/option/lists** represents the list folder relative path

**"Display all the lists of the board"** description of the list folder

- usage: to add description of required folder taht will be reflected in meta.json file

**"/src/actions/icons/icon123.png"** represent local path to the icon relative to root directory
it can also have remote http path for icon like _"https://raw.githubusercontent.com/workerb-io/wb-github/master/src/actions/branch.png"_

:warning: While adding any paths, do not add **"."** in front like this:
_iconPath: "./src/actions/icons/icon123.png"_ OR
_path: "./boards/option/lists",_
This will cause an internal error for more information refer to this [Stackoverflow question](https://stackoverflow.com/questions/13541948/node-js-cant-open-files-error-enoent-stat-path-to-file)
---
## Add Description in action scripts

### Prerequisites for this

_add [Terser Plugin](https://webpack.js.org/plugins/terser-webpack-plugin/) in webpack.config.js_

```
optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: /(@description|@name|@ignore)/i,
          },
        }
      }),
    ],
  }
```

_This will preserve all the comments in the file which has either @description or @name or @ignore present_



_in any *.ts/*.js file_

```
// @description <add script/action description>
```

The description will be added in meta.json file just by adding a comment in each script/action with `@description`

<br />
<br />

## Ignore a particular file

add Comment with `@ignore` on the top of that file

```
// @ignore
```

With this the file will not be added as a reference in meta.json file in the dist folder

---
## Caution while adding the comments

While adding any special comments (contains either `@description` or `@ignore` or `@name`) make sure to add **Just before the any executable statement**

Example:
```
1. // @description some description
2. import { some-function } from 'any-library';
```
 if *some-function* is not used in the script means this line is not going to execute and it is the first most line after comments.
 In this case the @description comment will not going to preserve
