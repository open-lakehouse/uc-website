---
title: Introducing Unity Catalog AI 0.3.0 Release
category: guide
description: As part of our continued steadfast commitment to build a robust, flexible, and developer-friendly data catalog platform, we are excited to announce the release of Unity Catalog AI 0.3.0.
authors:
  - ben-wilson
  - jules-damji
thumbnail: ./thumbnail.jpg
date: April 22, 2025
---

As part of our continued steadfast commitment to build a robust, flexible, and developer-friendly data catalog platform, we are excited to announce the release of Unity Catalog AI 0.3.0.

Unity Catalog is a data catalog for managing all your data and AI assets easily and securely. You can use Unity Catalog to organize your data assets, collaborate, manage data access, and ensure compliance with data regulations. If you are new to Unity Catalog, read our blogs:  [What and Why Unity Catalog](/blogs/what-is-a-data-catalog-and-why-do-i-need-one) and [101 Tutorial on Unity Catalog](/blogs/2024-unity-catalog-101) to learn how to use it.

In this blog, we explore features and enhancements in this new release:

- Stronger Security Execution Modes
- Improved Developer Experience
- Better Integration capabilities

All these features extend the Unity Catalog capabilities for better management of your data and AI assets for governance. Let’s start with security features to better understand secure modes of execution.

## Stronger Security Execution Modes

Security has always been a cornerstone of Unity Catalog AI, and version 0.3.0 takes this commitment to the next level with a fundamental shift in how functions are executed.

### Sandbox Process Pool: Protection by Default

This release's most significant security feature is the new default 'sandbox' execution mode that replaces the previous main process implementation. This new execution mode runs all functions in an isolated process pool, providing several critical security benefits:

- **Isolation of Code Execution**: By executing functions in a separate process, any potential security vulnerabilities are contained within that isolated environment, protecting your main application.
- **Timeout Restrictions**: Functions can now be terminated if they exceed configurable time limits, preventing resource starvation attacks.
- **CPU Resource Limitations**: The sandbox restricts CPU usage, safeguarding against computationally intensive functions that could otherwise consume all available resources.
- **Memory Allocation Controls**: The sandbox can limit virtual memory allocation, particularly on Linux systems, preventing memory exhaustion attacks.
- **Blocked System Access Modules**: Several potentially dangerous modules that can access system resources are blocked by default in Sandbox mode, including:
  - **sys**
  - **subprocess**
  - **ctypes**
  - **socket**
  - **importlib**
  - **pickle**
  - **marshall**
  - **shutil**

These restrictions are configurable through environment variables, allowing teams to adopt security measures to their specific needs:

```py
# Environment variables to configure execution limits
# EXECUTOR_MAX_CPU_TIME_LIMIT=10  # Maximum CPU execution time (seconds)
# EXECUTOR_MAX_MEMORY_LIMIT=100   # Maximum VM allocation (MB)
# EXECUTOR_TIMEOUT=20             # Maximum wall clock time (seconds)
# EXECUTOR_DISALLOWED_MODULES     # Comma-separated list of blocked modules
```

If you would like to override the blocked modules (for instance, if you have a function that needs the **sys** module, you can specify the list of libraries that you would like blocked for execution to the **EXECUTOR_DISALLOWED_MODULES** environment variable where you deploy your agent application.

For teams that need the original execution behavior, the legacy mode remains available via the 'local' execution mode parameter within the client constructor:

## Create client with legacy local execution mode

```py
uc_client = UnitycatalogFunctionClient(api_client=api_client, execution_mode="local")
```

This dual-mode approach ensures backward compatibility while making security the default posture.

Next, let’s consider developer experience enhancements.

## Improved Developer Experience

Unity Catalog AI 0.3.0 introduces several features designed to dramatically streamline the developer experience, making function creation, testing, and debugging more intuitive.

### Developer-Friendly Debugging Mode

A standout feature in this release is the new development-only execution mode for **DatabricksFunctionClient**. This mode enables local subprocess execution with runtime protection and timeout controls without requiring serverless cluster execution. While not intended for production use, it significantly simplifies debugging and enables rapid iteration during development:

```py
# Create a client with development mode for local testing
debug_client = DatabricksFunctionClient(execution_mode='local')
```

This feature addresses a common pain point: developers have to deploy functions to serverless clusters for testing, which considerably slows down the development cycle.

### Python Callable Access

The new **get_function_as_callable** API represents a major step forward in developer productivity. With this feature, developers can retrieve UC-registered Python functions as direct Python callables:

```py
# Retrieve a UC function as a callable
my_callable = client.get_function_as_callable(
    function_name=f"{CATALOG}.{SCHEMA}.sample_python_func"
)

# Use it directly in your code
result = my_callable(2, 4)  # Returns 6
```

This capability is invaluable for testing and validation, as it enables developers to:

- Verify function behavior directly in their development environment
- Create test suites against UC functions
- Debug complex function interactions without deploying to production
- Iteratively improve function implementation

### Function Source Inspection

Complementing the callable access feature, the new **get_function_source** API allows developers to retrieve UC Python function definitions as strings:

```py
# Get the source code definition of a UC function
function_source = client.get_function_source(
    function_name=f"{CATALOG}.{SCHEMA}.sample_python_function"
)

print(function_source)
# Output: def sample_python_func(a: int, b: int) -> int:
#             return a + b
```

This feature enables:

- Inspection of existing function implementations
- Modifying and re-registering functions
- Documentation generation
- Code review and audit processes
- Knowledge sharing across development teams

This ability to extract function source makes it easier to maintain and evolve your function catalog over time, treating UC functions as living code rather than black boxes.

## Streamlined Integration for Reliability

Unity Catalog AI 0.3.0 introduces several enhancements that make integration smoother and more reliable, particularly in Databricks environments.

### Automatic Client Configuration

A major usability improvement in this release is the smart default behavior for toolkit integration. When using integration packages (e.g., unitycatalog-openai) with a **UCFunctionToolkit** instance, you no longer need to explicitly declare a **DatabricksFunctionClient** when a serverless connection is available:

```py
# Before: Required explicit client declaration
# client = DatabricksFunctionClient()
# toolkit = UCFunctionToolkit(client=client)

# Now: Automatic client creation when in Databricks environment
from unitycatalog.ai.openai import UCFunctionToolkit
toolkit = UCFunctionToolkit()  # Client is created automatically
```

This enhancement reduces boilerplate code and simplifies integration, making Unity Catalog AI more approachable for new users.

## Pydantic API and Document Enhancements

The final set of improvements in Unity Catalog AI 0.3.0 focuses on refining the developer interface and documentation experience.

### Silenced Pydantic Warnings

A small but significant improvement is the silencing of persistent Pydantic V2 warnings from LangChain API calls. While seemingly minor, this change improves the developer experience by eliminating noise in outputs and logs:

```py
# No more distracting Pydantic warnings in your console output
# import warnings
# warnings.filterwarnings("ignore", message=".*pydantic.*")
```

This change reflects our commitment to maintaining a clean, distraction-free development environment.

### Comprehensive Documentation Updates

The 0.3.0 release includes substantial documentation improvements:

- Updated toolkit instantiation examples for all integrations
- Fixed sidebar navigation to properly display all package integrations
- Corrected links to example notebooks within the repository
- Enhanced API documentation with more detailed examples

These documentation improvements make it easier for developers to find the information they need and to understand how to use Unity Catalog AI effectively in their projects.

## Getting Started

To try these new features, update your Unity Catalog AI to 0.3.0 using your package manager:

```
pip install --upgrade unitycatalog-ai==0.3.0
```

For detailed documentation and examples, visit our [Documentation](https://docs.unitycatalog.io/ai/client/).

## What’s next?

We hosted a webinar Apr 17, 2025 at 8:30 AM PST. If you missed it, you can watch the [recording here.](https://www.youtube.com/live/XD1Vy6uB43Q) The demo notebook is also available [here](https://github.com/unitycatalog/unitycatalog/blob/main/ai/core/UnityCatalog_AI_DevLoop.ipynb).
