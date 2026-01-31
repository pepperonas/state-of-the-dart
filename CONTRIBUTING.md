# 🤝 Contributing to State of the Dart

First off, thank you for considering contributing to State of the Dart! It's people like you that make this project great.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (see `.nvmrc`)
- npm 9+
- Git

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/state-of-the-dart.git
   cd state-of-the-dart
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   npm install

   # Backend
   cd server && npm install
   ```

3. **Set up environment**
   ```bash
   # Frontend
   cp env.example .env

   # Backend
   cd server && cp env.example .env
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd server && npm run dev
   ```

## ✏️ Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-cricket-mode`
- `fix/score-calculation-bug`
- `docs/update-readme`
- `refactor/player-context`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(game): add cricket game mode
fix(scoring): correct checkout calculation for 170
docs(readme): update installation instructions
```

## 🔄 Pull Request Process

1. **Create a new branch** from `main`
2. **Make your changes** following our style guidelines
3. **Write/update tests** for your changes
4. **Run the test suite** to ensure everything passes
5. **Update documentation** if needed
6. **Submit a Pull Request** with a clear description

### PR Checklist

- [ ] Code follows the project style
- [ ] Tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated if needed
- [ ] PR description is clear and complete

## 🎨 Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces over type aliases where appropriate
- Follow existing naming conventions

### React

- Use functional components with hooks
- Keep components small and focused
- Use React Context for state management
- Follow the existing component structure

### CSS/Tailwind

- Use Tailwind CSS utility classes
- Follow the existing class ordering
- Use CSS variables for theming
- Ensure dark mode compatibility

### File Structure

```
src/
├── components/     # React components (grouped by feature)
├── context/        # React Context providers
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── tests/          # Test files
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run coverage

# Run tests in UI mode
npm run test:ui
```

### Writing Tests

- Write tests for new features
- Update tests when fixing bugs
- Use descriptive test names
- Follow the existing test patterns

## 💬 Questions?

Feel free to:
- Open an [Issue](https://github.com/pepperonas/state-of-the-dart/issues)
- Start a [Discussion](https://github.com/pepperonas/state-of-the-dart/discussions)

---

Thank you for contributing! 🎯
