def get_r2_questions():
    questions = []

    # 1. Even or Odd
    questions.append({
        "title": "Even or Odd",
        "desc": "Given an integer N, print 'Even' if it is even, otherwise print 'Odd'.",
        "input_desc": "A single integer N.",
        "output_desc": "'Even' or 'Odd'.",
        "constraints": "-10^6 <= N <= 10^6",
        "sample_in": "4",
        "sample_out": "Even",
        "test_cases": [
            ("4", "Even", True),
            ("7", "Odd", True),
            ("0", "Even", False),
            ("-5", "Odd", False),
            ("-100", "Even", False),
            ("999999", "Odd", False)
        ]
    })

    # 2. Sum of N Numbers
    questions.append({
        "title": "Sum of N Numbers",
        "desc": "Read an integer N, followed by N integers. Print their sum.",
        "input_desc": "First line: N. Second line: N space-separated integers.",
        "output_desc": "A single integer representing the sum.",
        "constraints": "1 <= N <= 1000\n-1000 <= each number <= 1000",
        "sample_in": "3\n10 20 30",
        "sample_out": "60",
        "test_cases": [
            ("3\n10 20 30", "60", True),
            ("5\n-1 -2 -3 -4 -5", "-15", True),
            ("1\n42", "42", False),
            ("4\n0 0 0 0", "0", False),
            ("2\n1000 -1000", "0", False),
            ("6\n1 1 1 1 1 1", "6", False)
        ]
    })

    # 3. Factorial
    questions.append({
        "title": "Factorial",
        "desc": "Compute the factorial of a given non-negative integer N.",
        "input_desc": "A single integer N.",
        "output_desc": "The factorial of N.",
        "constraints": "0 <= N <= 12",
        "sample_in": "5",
        "sample_out": "120",
        "test_cases": [
            ("5", "120", True),
            ("0", "1", True),
            ("1", "1", False),
            ("3", "6", False),
            ("10", "3628800", False),
            ("12", "479001600", False)
        ]
    })

    # 4. Palindrome Check
    questions.append({
        "title": "Palindrome Check",
        "desc": "Check if a given string is a palindrome (ignore case). Print 'YES' if it is, else 'NO'.",
        "input_desc": "A single string consisting of alphabetical characters.",
        "output_desc": "'YES' or 'NO'.",
        "constraints": "1 <= length of string <= 1000",
        "sample_in": "Racecar",
        "sample_out": "YES",
        "test_cases": [
            ("Racecar", "YES", True),
            ("Hello", "NO", True),
            ("A", "YES", False),
            ("abBa", "YES", False),
            ("Python", "NO", False),
            ("Madam", "YES", False),
            ("abcdecba", "NO", False)
        ]
    })

    # 5. Fibonacci (Nth term)
    questions.append({
        "title": "Fibonacci (Nth term)",
        "desc": "Print the Nth Fibonacci number. Consider F(1) = 0, F(2) = 1, F(3) = 1, F(4) = 2, etc.",
        "input_desc": "A single integer N.",
        "output_desc": "The Nth Fibonacci number.",
        "constraints": "1 <= N <= 30",
        "sample_in": "5",
        "sample_out": "3",
        "test_cases": [
            ("5", "3", True),
            ("1", "0", True),
            ("2", "1", False),
            ("3", "1", False),
            ("10", "34", False),
            ("30", "514229", False)
        ]
    })

    # 6. Count Vowels
    questions.append({
        "title": "Count Vowels",
        "desc": "Given a string, count the number of vowels (a, e, i, o, u) ignoring case.",
        "input_desc": "A single string.",
        "output_desc": "An integer representing the vowel count.",
        "constraints": "1 <= length of string <= 1000",
        "sample_in": "Hello World",
        "sample_out": "3",
        "test_cases": [
            ("Hello World", "3", True),
            ("BCDFGH", "0", True),
            ("aeiou", "5", False),
            ("AEIOU", "5", False),
            ("a", "1", False),
            ("Python Programming", "4", False)
        ]
    })

    # 7. Reverse a String
    questions.append({
        "title": "Reverse a String",
        "desc": "Reverse the given string and print it.",
        "input_desc": "A single string.",
        "output_desc": "The reversed string.",
        "constraints": "1 <= length of string <= 1000",
        "sample_in": "hello",
        "sample_out": "olleh",
        "test_cases": [
            ("hello", "olleh", True),
            ("World", "dlroW", True),
            ("A", "A", False),
            ("Racecar", "racecaR", False),
            ("12345", "54321", False),
            ("abcde", "edcba", False)
        ]
    })

    # 8. Prime Check
    questions.append({
        "title": "Prime Check",
        "desc": "Check if a given number N is prime. Print 'YES' if prime, else 'NO'.",
        "input_desc": "A single integer N.",
        "output_desc": "'YES' or 'NO'.",
        "constraints": "1 <= N <= 10^6",
        "sample_in": "7",
        "sample_out": "YES",
        "test_cases": [
            ("7", "YES", True),
            ("10", "NO", True),
            ("1", "NO", False),
            ("2", "YES", False),
            ("97", "YES", False),
            ("1000000", "NO", False),
            ("999983", "YES", False)
        ]
    })

    # 9. Find Maximum in Array
    questions.append({
        "title": "Find Maximum in Array",
        "desc": "Given an integer N followed by N integers, find and print the maximum value among them.",
        "input_desc": "First line: N. Second line: N space-separated integers.",
        "output_desc": "The maximum integer.",
        "constraints": "1 <= N <= 1000\n-10^6 <= each number <= 10^6",
        "sample_in": "4\n10 50 20 5",
        "sample_out": "50",
        "test_cases": [
            ("4\n10 50 20 5", "50", True),
            ("3\n-10 -5 -20", "-5", True),
            ("1\n42", "42", False),
            ("5\n1 1 1 1 1", "1", False),
            ("2\n100 -100", "100", False),
            ("6\n999999 0 0 0 0 1000000", "1000000", False)
        ]
    })

    # 10. Armstrong Number
    questions.append({
        "title": "Armstrong Number",
        "desc": "Check if a given 3-digit number is an Armstrong number (sum of cubes of its digits equals the number itself). Print 'YES' or 'NO'.",
        "input_desc": "A single 3-digit integer N.",
        "output_desc": "'YES' or 'NO'.",
        "constraints": "100 <= N <= 999",
        "sample_in": "153",
        "sample_out": "YES",
        "test_cases": [
            ("153", "YES", True),
            ("123", "NO", True),
            ("370", "YES", False),
            ("371", "YES", False),
            ("407", "YES", False),
            ("999", "NO", False),
            ("100", "NO", False)
        ]
    })

    return questions
