// Corrige o bug de tipagem do react-native-webview onde P = undefined colapsa para never em TS 5/6
const fs = require('fs');
const path = require('path');

const webviewDtsPath = path.resolve(__dirname, '../node_modules/react-native-webview/index.d.ts');

if (fs.existsSync(webviewDtsPath)) {
  const content = fs.readFileSync(webviewDtsPath, 'utf8');
  if (content.includes('declare class WebView<P = undefined>')) {
    const updated = content.replace(
      'declare class WebView<P = undefined>',
      'declare class WebView<P = {}>'
    );
    fs.writeFileSync(webviewDtsPath, updated, 'utf8');
    console.log('✓ react-native-webview type definition patched successfully.');
  }
}

