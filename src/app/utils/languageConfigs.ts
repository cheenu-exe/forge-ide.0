export type LanguageKey =
  | 'cpp'
  | 'c'
  | 'python'
  | 'java'
  | 'javascript'
  | 'go'
  | 'rust'
  | 'php'
  | 'csharp';

export interface LanguageConfig {
  key: LanguageKey;
  label: string;
  monacoLanguage: string;
  extension: string;
  version: string;
  icon: string;
  starterTemplate: string;
}

export const LANGUAGE_CONFIGS: Record<LanguageKey, LanguageConfig> = {
  cpp: {
    key: 'cpp',
    label: 'C++',
    monacoLanguage: 'cpp',
    extension: 'cpp',
    version: 'C++17 (GCC)',
    icon: 'C++',
    starterTemplate: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cout << "Hello, World!" << '\\n';
    return 0;
}
`,
  },
  c: {
    key: 'c',
    label: 'C',
    monacoLanguage: 'c',
    extension: 'c',
    version: 'C17 (GCC)',
    icon: 'C',
    starterTemplate: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  python: {
    key: 'python',
    label: 'Python 3',
    monacoLanguage: 'python',
    extension: 'py',
    version: 'Python 3',
    icon: 'Py',
    starterTemplate: `def main() -> None:
    print("Hello, World!")


if __name__ == "__main__":
    main()
`,
  },
  java: {
    key: 'java',
    label: 'Java',
    monacoLanguage: 'java',
    extension: 'java',
    version: 'OpenJDK 21',
    icon: 'J',
    starterTemplate: `import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        System.out.println("Hello, World!");
    }
}
`,
  },
  javascript: {
    key: 'javascript',
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    extension: 'js',
    version: 'Node.js 20',
    icon: 'JS',
    starterTemplate: `const fs = require('fs');

const input = fs.readFileSync(0, 'utf8').trim();
void input;

console.log('Hello, World!');
`,
  },
  go: {
    key: 'go',
    label: 'Go',
    monacoLanguage: 'go',
    extension: 'go',
    version: 'Go 1.22',
    icon: 'Go',
    starterTemplate: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
  },
  rust: {
    key: 'rust',
    label: 'Rust',
    monacoLanguage: 'rust',
    extension: 'rs',
    version: 'Rust 1.79',
    icon: 'Rs',
    starterTemplate: `fn main() {
    println!("Hello, World!");
}
`,
  },
  php: {
    key: 'php',
    label: 'PHP',
    monacoLanguage: 'php',
    extension: 'php',
    version: 'PHP 8.3',
    icon: 'PHP',
    starterTemplate: `<?php

echo "Hello, World!" . PHP_EOL;
`,
  },
  csharp: {
    key: 'csharp',
    label: 'C#',
    monacoLanguage: 'csharp',
    extension: 'cs',
    version: 'C# 12 (.NET 8)',
    icon: 'C#',
    starterTemplate: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`,
  },
};

export const LANGUAGE_ORDER: LanguageKey[] = [
  'cpp',
  'c',
  'python',
  'java',
  'javascript',
  'go',
  'rust',
  'php',
  'csharp',
];
