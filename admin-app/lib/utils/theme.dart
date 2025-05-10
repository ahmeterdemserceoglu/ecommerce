import 'package:flutter/material.dart';

class AdminTheme {
  static const Color primary = Color(0xFFFF8000); // Turuncu
  static const Color black = Color(0xFF000000);
  static const Color white = Color(0xFFFFFFFF);
  static const Color lightGrey = Color(0xFFF8F9FB);
  static const Color borderGrey = Color(0xFFE5E7EB);
  static const Color errorRed = Color(0xFFEF4444);

  static ThemeData get theme {
    return ThemeData(
      fontFamily: 'Inter', // Google Fonts üzerinden ekleyebilirsin
      scaffoldBackgroundColor: lightGrey,
      primaryColor: primary,
      appBarTheme: AppBarTheme(
        backgroundColor: white,
        elevation: 0,
        iconTheme: IconThemeData(color: black),
        titleTextStyle: TextStyle(
          color: black,
          fontWeight: FontWeight.bold,
          fontSize: 20,
        ),
      ),
      textTheme: TextTheme(
        titleLarge: TextStyle(color: black, fontWeight: FontWeight.bold),
        bodyMedium: TextStyle(color: black),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: borderGrey),
        ),
      ),
      cardTheme: CardTheme(
        color: white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: borderGrey),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: black,
          side: BorderSide(color: borderGrey),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }
}
