# GameDay Platform Web Application

Enterprise-grade React application for conducting and managing tabletop exercises with AI-driven scenarios and real-time collaboration capabilities.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Environment](#development-environment)
- [Architecture](#architecture)
- [Development Guidelines](#development-guidelines)
- [Testing](#testing)
- [Security](#security)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- VSCode >= 1.80.0 (recommended)
- Git >= 2.40.0

## Quick Start

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Development Environment

### VSCode Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Jest Runner
- Error Lens
- GitLens

### Environment Configuration
Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001
VITE_SENTRY_DSN=[your-sentry-dsn]
VITE_ENVIRONMENT=development
```

### Code Quality Tools

- **ESLint**: JavaScript/TypeScript linting
  - Configuration: `.eslintrc.js`
  - Run: `npm run lint`

- **Prettier**: Code formatting
  - Configuration: `.prettierrc`
  - Run: `npm run format`

- **TypeScript**: Static type checking
  - Configuration: `tsconfig.json`
  - Run: `npm run type-check`

## Architecture

### Tech Stack
- React 18.2.0
- TypeScript 5.3.0
- Material-UI 5.14.0
- Redux Toolkit 2.0.0
- React Query 3.39.0
- Socket.IO Client 4.7.0

### Project Structure
```
src/
├── api/          # API integration layer
├── assets/       # Static assets
├── components/   # Reusable UI components
├── features/     # Feature-based modules
├── hooks/        # Custom React hooks
├── layouts/      # Page layouts
├── services/     # Business logic services
├── store/        # Redux store configuration
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

## Development Guidelines

### Component Development
- Use functional components with hooks
- Implement error boundaries
- Follow atomic design principles
- Maintain proper prop-types/TypeScript interfaces
- Document complex logic with JSDoc

### State Management
- Use Redux for global application state
- React Query for server state
- Local state with useState/useReducer
- Context API for theme/localization

### Code Style
```typescript
// Component example
import { FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

interface ExerciseCardProps {
  title: string;
  status: 'active' | 'completed' | 'scheduled';
  onSelect: (id: string) => void;
}

export const ExerciseCard: FC<ExerciseCardProps> = memo(({
  title,
  status,
  onSelect
}) => {
  const { t } = useTranslation();
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Chip label={t(`status.${status}`)} />
      </CardContent>
    </Card>
  );
});
```

## Testing

### Test Types
- Unit Tests: Jest + Testing Library
- Integration Tests: Jest + MSW
- E2E Tests: Cypress
- Accessibility Tests: jest-axe

### Running Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage report
npm test -- --coverage
```

## Security

### Implementation
- CSRF protection
- XSS prevention
- Content Security Policy
- Secure HTTP headers
- API request encryption
- Secure WebSocket connections

### Best Practices
- Input sanitization
- Output encoding
- Authentication token handling
- Secure storage practices
- Regular dependency updates

## Performance

### Optimization Techniques
- Code splitting
- Lazy loading
- Image optimization
- Bundle size monitoring
- Virtual scrolling
- Memoization

### Monitoring
- Lighthouse metrics
- Core Web Vitals
- Performance budgets
- Error tracking (Sentry)

## Accessibility

### Standards
- WCAG 2.1 Level AA compliance
- WAI-ARIA implementation
- Keyboard navigation
- Screen reader support
- Color contrast requirements

### Testing Tools
- axe-core
- WAVE
- Keyboard navigation testing
- Screen reader testing

## Deployment

### Build Process
```bash
# Production build
npm run build

# Preview build
npm run preview
```

### CI/CD Pipeline
- GitHub Actions workflow
- Automated testing
- Build validation
- Security scanning
- Deployment to staging/production

## Troubleshooting

### Common Issues
1. **Build Failures**
   - Clear node_modules and package-lock.json
   - Run `npm clean-install`

2. **Type Errors**
   - Run `npm run type-check`
   - Update @types dependencies

3. **Performance Issues**
   - Check React DevTools Profiler
   - Analyze bundle size
   - Review network waterfall

### Support
- GitHub Issues
- Internal Documentation
- Team Chat Channels

## Contributing
Please refer to CONTRIBUTING.md for detailed guidelines on:
- Branch naming
- Commit messages
- Pull request process
- Code review requirements

## License
Copyright © 2024 GameDay Platform. All rights reserved.