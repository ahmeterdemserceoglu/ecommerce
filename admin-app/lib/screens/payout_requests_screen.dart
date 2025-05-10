import 'package:flutter/material.dart';

class PayoutRequestsScreen extends StatelessWidget {
  const PayoutRequestsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ödeme Talepleri')),
      body: const Center(child: Text('Ödeme Talepleri ekranı')),
    );
  }
}
