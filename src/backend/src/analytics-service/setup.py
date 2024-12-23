# setuptools v68.0.0 - Package distribution tools for Python packages
# wheel v0.40.0 - Built distribution format for Python packages
from setuptools import setup, find_packages
from pathlib import Path

# Package metadata constants
PACKAGE_NAME = "analytics-service"
VERSION = "1.0.0"
DESCRIPTION = "Analytics service for GameDay Platform providing real-time metrics, gap analysis, and comprehensive reporting capabilities"
AUTHOR = "GameDay Platform Team"
PYTHON_REQUIRES = ">=3.11,<4.0"

def read_requirements() -> list[str]:
    """
    Reads and parses package requirements from requirements.txt file.
    
    Returns:
        List of package requirement strings with versions
    """
    requirements_path = Path(__file__).parent / "requirements.txt"
    try:
        with open(requirements_path) as f:
            return [
                line.strip()
                for line in f.readlines()
                if line.strip() and not line.startswith("#")
            ]
    except FileNotFoundError:
        return []

def read_long_description() -> str:
    """
    Reads the long description from README.md file for package documentation.
    
    Returns:
        Content of README.md as a string
    """
    readme_path = Path(__file__).parent / "README.md"
    try:
        with open(readme_path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return DESCRIPTION

setup(
    # Basic package metadata
    name=PACKAGE_NAME,
    version=VERSION,
    description=DESCRIPTION,
    long_description=read_long_description(),
    long_description_content_type="text/markdown",
    author=AUTHOR,
    
    # Package configuration
    packages=find_packages(exclude=["tests*", "docs*"]),
    python_requires=PYTHON_REQUIRES,
    install_requires=read_requirements(),
    
    # Type hints and package data
    package_data={
        "analytics_service": [
            "py.typed",  # Marker file for PEP 561 type hints
            "*.pyi",     # Type stub files
            "**/*.json"  # Configuration files
        ]
    },
    
    # Additional configuration
    zip_safe=False,  # Required for proper type hint support
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Information Technology",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Monitoring",
        "Topic :: System :: Systems Administration",
        "Typing :: Typed"
    ],
    
    # Project URLs
    project_urls={
        "Documentation": "https://docs.gameday-platform.com/analytics-service",
        "Source": "https://github.com/gameday-platform/analytics-service",
        "Issues": "https://github.com/gameday-platform/analytics-service/issues"
    },
    
    # Entry points for CLI tools or plugins
    entry_points={
        "console_scripts": [
            "analytics-service=analytics_service.cli:main"
        ]
    }
)