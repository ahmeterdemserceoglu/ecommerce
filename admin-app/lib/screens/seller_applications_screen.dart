import 'package:flutter/material.dart';

class SellerApplicationsScreen extends StatelessWidget {
  const SellerApplicationsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Satıcı Başvuruları')),
      body: const Center(child: Text('Satıcı Başvuruları ekranı')),
    );
  }
}
