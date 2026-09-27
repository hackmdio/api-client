export default {
  input: '../nodejs/spec/hackmd-openapi.json',
  output: './src/hackmd_api/generated',
  plugins: [{ name: '@hey-api/python-sdk', paramsStructure: 'flat' }],
};
