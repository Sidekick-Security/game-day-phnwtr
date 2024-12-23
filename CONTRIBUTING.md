# Contributing to GameDay Platform

Welcome to the GameDay Platform project! We're excited that you're interested in contributing to our mission of transforming tabletop exercises through AI-driven automation and coordination.

## Table of Contents
- [Introduction](#introduction)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Submission Guidelines](#submission-guidelines)
- [Code Standards](#code-standards)

## Introduction

### Project Mission and Values
The GameDay Platform aims to revolutionize incident response training by providing an AI-driven, automated platform for conducting regular tabletop exercises. We value:
- Security-first development
- Enterprise-grade reliability
- Inclusive collaboration
- Continuous improvement

### Code of Conduct
All contributors are expected to adhere to our Code of Conduct. Please read it before participating.

### Important Resources
- [Technical Documentation](./docs)
- [API Documentation](./docs/api)
- [Security Guidelines](./docs/security)
- [Architecture Overview](./docs/architecture)

### Communication Channels
- GitHub Issues: Feature requests and bug reports
- Slack: Real-time collaboration
- Technical Forums: Architecture discussions
- Security Advisory: Private security issue reporting

## Development Setup

### System Requirements
- Node.js 20 LTS
- Python 3.11+
- Docker 24.0+
- Git 2.40+
- VSCode (recommended)

### Development Tools Installation

1. **VSCode Setup**
   ```bash
   # Install recommended extensions
   code --install-extension dbaeumer.vscode-eslint
   code --install-extension esbenp.prettier-vscode
   code --install-extension ms-python.python
   ```

2. **Git Configuration**
   ```bash
   git config --global core.autocrlf input
   git config --global pull.rebase true
   ```

3. **Docker Setup**
   ```bash
   # Install Docker and Docker Compose
   # Verify installation
   docker --version
   docker-compose --version
   ```

### Repository Structure
```
gameday-platform/
├── .github/          # GitHub workflows and templates
├── src/             # Source code
├── tests/           # Test suites
├── docs/            # Documentation
├── scripts/         # Development scripts
└── config/          # Configuration files
```

### Environment Configuration
1. Copy `.env.example` to `.env.local`
2. Configure required environment variables
3. Never commit sensitive credentials
4. Use secrets management for production values

### Build and Test Commands
```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Run development server
npm run dev

# Run tests
npm run test
pytest

# Build production
npm run build
```

## Development Workflow

### Branch Management
```
main           # Production releases
  ↑
develop        # Integration branch
  ↑
feature/*      # New features
bugfix/*       # Bug fixes
security/*     # Security updates
```

### Commit Message Standards
```
<type>(<scope>): <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- perf: Performance improvement
- test: Testing
- build: Build system
- ci: CI pipeline
- security: Security improvements

Example:
feat(exercise): add AI-driven scenario generation
```

### Code Style Guidelines

#### TypeScript/JavaScript
- Follow Airbnb TypeScript Style Guide
- Use ESLint with security rules
- Format with Prettier
- Maintain 80% test coverage

#### Python
- Follow PEP 8 guidelines
- Use pylint with security plugins
- Format with black
- Maintain 80% test coverage

### Testing Requirements
- Unit tests required for all new code
- Integration tests for API endpoints
- Security tests for authentication flows
- Performance tests for critical paths
- Accessibility tests for UI components

## Submission Guidelines

### Issue Creation
1. Use appropriate issue template
2. Provide detailed reproduction steps
3. Include system information
4. Tag relevant stakeholders

### Pull Request Process
1. Create feature branch from develop
2. Implement changes following standards
3. Add/update tests and documentation
4. Run local test suite
5. Submit PR using template
6. Address review feedback

### Code Review Requirements
- Code owner approval required
- Security review for sensitive changes
- Documentation review
- CI pipeline must pass
- Performance impact assessed

### CI/CD Pipeline Checks
- Linting (ESLint/pylint)
- Unit tests
- Integration tests
- Security scans
- Dependency checks
- Build verification
- Documentation build

## Code Standards

### Security Requirements
- Implement authentication for all endpoints
- Use parameterized queries
- Validate all inputs
- Encrypt sensitive data
- Follow least privilege principle
- Document security considerations
- Regular dependency updates

### Performance Guidelines
- Optimize database queries
- Implement caching where appropriate
- Minimize API calls
- Use pagination for large datasets
- Profile critical paths
- Document performance considerations

### Accessibility Requirements
- Follow WCAG 2.1 Level AA
- Implement keyboard navigation
- Provide screen reader support
- Use semantic HTML
- Maintain color contrast
- Test with accessibility tools

### Documentation Standards
- Update README.md for new features
- Document API changes in OpenAPI
- Update architecture diagrams
- Include security considerations
- Add performance implications
- Document configuration changes

## Questions and Support

For questions or support:
1. Check existing documentation
2. Search closed issues
3. Open new issue with question tag
4. Contact maintainers via Slack

Thank you for contributing to the GameDay Platform!