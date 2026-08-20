const fs = require('fs');
const path = require('path');

const pages = ['Home', 'EventDetails', 'Checkout', 'MinhasCompras', 'LocationEvents'];
const dir = path.join(__dirname, 'src', 'pages');

pages.forEach(page => {
  const content = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ${page}() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Página: ${page}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  }
});
`;
  fs.writeFileSync(path.join(dir, `${page}.js`), content);
});
console.log('Placeholders criados com sucesso!');
