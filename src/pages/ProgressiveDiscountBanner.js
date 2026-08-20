import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressiveDiscountBanner({ tiers }) {
  if (!tiers || tiers.length === 0) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Desconto Progressivo</Text>
      <View style={styles.tiersContainer}>
        {tiers.map((tier, idx) => (
          <View key={idx} style={styles.tier}>
            <Text style={styles.tierText}>Compre {tier.quantity} fotos: {tier.discount}% OFF</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937'
  },
  tiersContainer: {
    flexDirection: 'column',
    gap: 4
  },
  tierText: {
    fontSize: 14,
    color: '#4b5563'
  }
});
