String? validateEmail(String? value) {
  if (value == null || value.isEmpty) {
    return 'Email is required';
  }

  final emailRegExp = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
  if (!emailRegExp.hasMatch(value)) {
    return 'Please enter a valid email';
  }

  return null;
}

String? validatePassword(String? value) {
  if (value == null || value.isEmpty) {
    return 'Password is required';
  }

  if (value.length < 6) {
    return 'Password must be at least 6 characters';
  }

  return null;
}

String? validateRequired(String? value, String fieldName) {
  if (value == null || value.isEmpty) {
    return '$fieldName is required';
  }

  return null;
}

String? validateNumber(String? value, String fieldName) {
  if (value == null || value.isEmpty) {
    return '$fieldName is required';
  }

  if (double.tryParse(value) == null) {
    return 'Please enter a valid number';
  }

  return null;
}

String? validatePositiveNumber(String? value, String fieldName) {
  final numberError = validateNumber(value, fieldName);
  if (numberError != null) {
    return numberError;
  }

  final number = double.parse(value!);
  if (number <= 0) {
    return 'Please enter a positive number';
  }

  return null;
}

String? validateUrl(String? value) {
  if (value == null || value.isEmpty) {
    return null; // URL might be optional
  }

  final urlRegExp = RegExp(
    r'^(https?:\/\/)'
            r'((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|' + // domain name
        r'((\d{1,3}\.){3}\d{1,3}))' + // OR ip (v4) address
        r'(\:\d+)?(\/[-a-z\d%_.~+]*)*' + // port and path
        r'(\?[;&a-z\d%_.~+=-]*)?' + // query string
        r'(\#[-a-z\d_]*)?$', // fragment locator
    caseSensitive: false,
  );

  if (!urlRegExp.hasMatch(value)) {
    return 'Please enter a valid URL';
  }

  return null;
}
