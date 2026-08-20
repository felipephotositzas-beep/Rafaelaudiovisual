import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { ShoppingCart } from 'lucide-react-native';
import CartModal from './CartModal';
import { Colors, FontWeights, Radius, Spacing } from '../constants/theme';

const theme = Colors.light;

// Web version: this component renders nothing at the page level.
// The cart button is integrated into the App.web.js header instead.
// This file exists so imports in EventDetails don't break.
export default function CartFloatingBar() {
  return null;
}
