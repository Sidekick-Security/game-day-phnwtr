from setuptools import setup, find_packages

def read_requirements():
    """Read package requirements from requirements.txt file."""
    with open("requirements.txt", "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="scenario_service",
    version="1.0.0",
    description="AI-driven scenario generation and validation service for GameDay Platform",
    author="GameDay Platform Team",
    author_email="team@gamedayplatform.com",
    
    # Package discovery and dependencies
    packages=find_packages(),
    python_requires=">=3.11",
    install_requires=[
        "fastapi==0.100.0",        # High performance API framework
        "langchain==0.1.0",        # LLM integration framework
        "pydantic==2.0.0",         # Data validation
        "uvicorn==0.23.0",         # ASGI server
        "openai==1.0.0",           # OpenAI API integration
        "httpx==0.24.1",           # Async HTTP client
        "tenacity==8.2.3",         # Retry handling
        "redis==4.7.0"             # Caching and rate limiting
    ],
    
    # Development dependencies
    extras_require={
        "dev": [
            "pytest==7.4.0",       # Testing framework
            "pytest-cov==4.1.0",   # Test coverage
            "black==23.7.0",       # Code formatting
            "isort==5.12.0",       # Import sorting
            "mypy==1.4.0",         # Type checking
            "flake8==6.1.0"        # Code linting
        ]
    },
    
    # Package metadata and classifiers
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Security",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Intended Audience :: Information Technology",
        "Framework :: FastAPI",
        "Typing :: Typed"
    ],
    
    # Project URLs
    project_urls={
        "Documentation": "https://docs.gamedayplatform.com/scenario-service",
        "Source": "https://github.com/gamedayplatform/scenario-service",
        "Issues": "https://github.com/gamedayplatform/scenario-service/issues"
    },
    
    # Package data and entry points
    include_package_data=True,
    zip_safe=False,
    entry_points={
        "console_scripts": [
            "scenario-service=scenario_service.main:main"
        ]
    }
)