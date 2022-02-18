const path = require('path')

module.exports = {
    "parser": "@typescript-eslint/parser",
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
        "no-trailing-spaces": ["warn", { "skipBlankLines": false }],
        "semi": ["warn", "never"],
        "@typescript-eslint/no-non-null-assertion": "off",
        "keyword-spacing": ["warn", {"before": true, "after": true}],
        "space-infix-ops": "warn",
        "space-before-function-paren": "warn"
    },
    "parserOptions": {
      "project": [
        path.resolve(__dirname, "tsconfig.json")
      ]
    }
}