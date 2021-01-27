# meta-json-generator

This is a webpack plugin specially designed for workerB packages in order to create meta.json files dynamically.

## How to add the plugin in a workerB package ?
```yarn add workerb-io/meta-json-generator -D```

OR

_in package.json_
```
"dependencies": {
    "meta-json-generator": "workerb-io/meta-json-generator"
}

yarn install
```

## How to use the plugin ?

_in webpack.config.js_ file

import the plugin

```const WBMetaJsonGenerator = require("meta-json-generator");```

```
module.exports = {
    plugins: [
        new WBMetaJsonGenerator({
            package: "<package name>",
            packageDescription: "<package descrition>"
            folderDescriptionList: [
                { path: "/boards", description: "Display all the boards"},
                { path: "/boards/option/lists", description: "Display all the lists of the board"}
            }
        })
    ]
}
```

## Parameter Explanation

### _package_ 
- type: string
- value: name of the package
- usage: in root meta.json file name property

### _packageDescription_
- type: string
- value: description of the package
- usage: in root meta.json file description property

### _folderDescriptionList_
- type: array
- value: an array of object having folder path/ description as key value pair

```
    [
        {   path: "/boards/option/lists",
            description: "Display all the lists of the board"
        }
    ]
```


**/boards/option/lists** represents the list folder relative path

**"Display all the lists of the board"** description of the list folder

- usage: to add description of required folder taht will be reflected in meta.json file

---
## Add Description in action scripts

### Prerequisites for this

_add UglifyJs plugin in webpack.config.js_

```
optimization: {
    minimizer: [
      new UglifyJsPlugin({
        uglifyOptions: {
          output: {
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
2. import {something} from 'any-library';
```
 if *something* is not used in the script means this line is not going to execute and it is the first most line after comments.
 In this case the @description comment will not going to preserve



