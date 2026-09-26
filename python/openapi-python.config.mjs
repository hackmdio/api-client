export default {
  input: '../nodejs/spec/hackmd-openapi.json',
  output: './.generated',
  plugins: [{ name: '@hey-api/python-sdk', paramsStructure: 'flat' }],
};
