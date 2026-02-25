"""Test fixture for Python function extraction."""

from typing import Optional, List, Dict, Any

__all__ = [
    "greet",
    "calculate_area",
    "fetch_data",
    "process_items",
    "deprecated_func",
    "numpy_func",
    "sphinx_func",
]


def greet(name: str, greeting: str = "Hello") -> str:
    """Generate a greeting message.

    Args:
        name (str): The name of the person to greet.
        greeting (str): The greeting word to use.

    Returns:
        str: The formatted greeting message.

    Examples:
        >>> greet("World")
        'Hello, World!'
    """
    return f"{greeting}, {name}!"


def calculate_area(width: float, height: float) -> float:
    """Calculate the area of a rectangle.

    Args:
        width: The width of the rectangle.
        height: The height of the rectangle.

    Returns:
        float: The calculated area.

    Raises:
        ValueError: If width or height is negative.
    """
    if width < 0 or height < 0:
        raise ValueError("Dimensions must be non-negative")
    return width * height


async def fetch_data(url: str, timeout: int = 30, **kwargs: Any) -> Dict[str, Any]:
    """Fetch data from a remote URL.

    Args:
        url (str): The URL to fetch from.
        timeout (int): Request timeout in seconds.
        **kwargs: Additional keyword arguments passed to the HTTP client.

    Returns:
        Dict[str, Any]: The parsed response data.

    Raises:
        ConnectionError: If the URL is unreachable.
        TimeoutError: If the request exceeds the timeout.

    .. versionadded:: 2.1
    """
    pass


def process_items(items: List[str], *args: str, verbose: bool = False) -> None:
    """Process a list of items.

    Args:
        items (List[str]): Items to process.
        *args: Additional items to append.
        verbose (bool): Whether to print progress.

    Returns:
        None: This function returns nothing.
    """
    pass


def deprecated_func(x: int) -> int:
    """An old function that should not be used.

    Args:
        x (int): Input value.

    Returns:
        int: The processed value.

    .. deprecated:: 3.0
        Use ``new_func`` instead.
    """
    return x


def numpy_func(data: List[float], axis: int = 0) -> float:
    """Compute the mean along an axis.

    Parameters
    ----------
    data : List[float]
        The input data array.
    axis : int, optional
        The axis along which to compute. Default is 0.

    Returns
    -------
    float
        The computed mean value.

    Raises
    ------
    ValueError
        If the data is empty.

    .. versionadded:: 1.5
    """
    pass


def sphinx_func(path: str, mode: str = "r") -> Optional[str]:
    """Read content from a file path.

    :param path: The file system path to read.
    :type path: str
    :param mode: The file open mode.
    :type mode: str
    :returns: The file contents, or None if not found.
    :rtype: Optional[str]
    :raises FileNotFoundError: If the path does not exist.
    :raises PermissionError: If read access is denied.
    """
    pass


def _private_helper(x: int) -> int:
    """This should be excluded from extraction."""
    return x * 2


def _also_private() -> None:
    """Another private function."""
    pass
