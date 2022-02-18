const path = require('path')

module.exports = {
    "parser": "@typescript-eslint/parser",
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
        "no-trailing-spaces": [1, { "skipBlankLines": false }],
        "semi": [1, "never"],
        '@typescript-eslint/no-non-null-assertion': 'off'
    },
    "parserOptions": {
      "project": [
        path.resolve(__dirname, "tsconfig.json")
      ]
    }
}