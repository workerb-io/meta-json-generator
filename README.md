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
            folderDescription: {
                "/boards": "Display all the boards!",
                "/boards/option/lists": "Display all the lists of the board"
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

### _folderDescription_
- type: object
- value: an object with folder path/ description as key value pair

```
    {
        "/boards/option/lists": "Display all the lists of the board"
    }
```


**/boards/option/lists** represents the list folder relative path

**"Display all the lists of the board"** description of the list folder

- usage: to add description of required folder taht will be reflected in meta.json file


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

The description will be added in meta.json file just by adding a comment in each script/action with **@description**



