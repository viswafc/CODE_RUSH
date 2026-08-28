import json

def generate_mcqs():
    questions = []
    
    # Python Templates
    py_templates = [
        {
            "title": "List Mutation Bug",
            "desc": "The function is supposed to append an item to a list, but it's not working as expected across multiple calls.",
            "code": "def add_item(item, lst=[]):\n    lst.append(item)\n    return lst",
            "options": {
                "A": "Use `lst=None` and initialize inside.",
                "B": "Use `lst=list()` in the arguments.",
                "C": "Use `lst={}` in the arguments.",
                "D": "The code is already perfectly correct."
            },
            "correct": "A"
        },
        {
            "title": "IndexError",
            "desc": "This loop is causing an IndexError.",
            "code": "arr = [1, 2, 3, 4]\nfor i in range(len(arr) + 1):\n    print(arr[i])",
            "options": {
                "A": "Change `range(len(arr) + 1)` to `range(len(arr))`.",
                "B": "Change `print(arr[i])` to `print(arr[i-1])`.",
                "C": "Change to `for i in arr:` and print `arr[i]`.",
                "D": "Add a try/except block to ignore the error."
            },
            "correct": "A"
        },
        {
            "title": "Type Error on Concat",
            "desc": "String concatenation fails here.",
            "code": "age = 20\nprint('I am ' + age + ' years old.')",
            "options": {
                "A": "Change `+` to `,` everywhere.",
                "B": "Wrap `age` in `str(age)`.",
                "C": "Wrap `age` in `int(age)`.",
                "D": "Use `concat(age)`."
            },
            "correct": "B"
        },
        {
            "title": "Variable Scope Bug",
            "desc": "Function raises UnboundLocalError.",
            "code": "count = 0\ndef increment():\n    count += 1\nincrement()",
            "options": {
                "A": "Pass count as a parameter.",
                "B": "Add `global count` inside the function.",
                "C": "Use `return count + 1`.",
                "D": "Both A and B are valid fixes."
            },
            "correct": "D"
        }
    ]

    # Java Templates
    java_templates = [
        {
            "title": "String Comparison",
            "desc": "The strings are not comparing correctly.",
            "code": "String a = new String(\"hello\");\nString b = new String(\"hello\");\nif (a == b) {\n    System.out.println(\"Equal\");\n}",
            "options": {
                "A": "Use `a.equals(b)` instead of `a == b`.",
                "B": "Use `a === b` instead of `a == b`.",
                "C": "Change `String b` to `char[] b`.",
                "D": "The code works fine."
            },
            "correct": "A"
        },
        {
            "title": "Null Pointer Exception",
            "desc": "This code throws a NullPointerException.",
            "code": "String str = null;\nSystem.out.println(str.length());",
            "options": {
                "A": "Use `str?.length()`.",
                "B": "Check `if (str != null)` before accessing length.",
                "C": "Initialize `str` with `\"\"` instead of `null`.",
                "D": "Both B and C are valid fixes."
            },
            "correct": "D"
        },
        {
            "title": "Array Index Out of Bounds",
            "desc": "This loop causes an exception.",
            "code": "int[] arr = {1, 2, 3};\nfor (int i = 0; i <= arr.length; i++) {\n    System.out.println(arr[i]);\n}",
            "options": {
                "A": "Change `i <= arr.length` to `i < arr.length`.",
                "B": "Change `i = 0` to `i = 1`.",
                "C": "Use an enhanced for loop: `for(int x : arr)`.",
                "D": "Both A and C are valid fixes."
            },
            "correct": "D"
        }
    ]

    # C Templates
    c_templates = [
        {
            "title": "Pointer Dereference",
            "desc": "This code segfaults.",
            "code": "int *p;\n*p = 10;",
            "options": {
                "A": "Allocate memory for `p` or assign it the address of a valid int.",
                "B": "Change `*p = 10;` to `p = 10;`.",
                "C": "Change `int *p;` to `int &p;`.",
                "D": "The code is correct."
            },
            "correct": "A"
        },
        {
            "title": "Array Out of Bounds",
            "desc": "This causes undefined behavior.",
            "code": "int arr[5];\narr[5] = 10;",
            "options": {
                "A": "Change `arr[5]` to `arr[4]`.",
                "B": "Change `arr[5]` to `arr[6]`.",
                "C": "Increase array size to 5.",
                "D": "Use `malloc` for the array."
            },
            "correct": "A"
        },
        {
            "title": "Missing Return Statement",
            "desc": "Function does not return properly.",
            "code": "int add(int a, int b) {\n    int sum = a + b;\n}",
            "options": {
                "A": "Add `return sum;` at the end.",
                "B": "Change return type to `void`.",
                "C": "Pass arguments by reference.",
                "D": "Code will compile and run perfectly anyway."
            },
            "correct": "A"
        }
    ]

    # Generate 40 questions (14 py, 13 java, 13 c)
    for i in range(40):
        if i < 14:
            base = py_templates[i % len(py_templates)]
            lang = "python"
        elif i < 27:
            base = java_templates[i % len(java_templates)]
            lang = "java"
        else:
            base = c_templates[i % len(c_templates)]
            lang = "c"
            
        questions.append({
            "title": f"{base['title']} #{i+1}",
            "desc": base["desc"],
            "code": base["code"],
            "options": base["options"],
            "correct": base["correct"],
            "lang": lang
        })
        
    return questions
