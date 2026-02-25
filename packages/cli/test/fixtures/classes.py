"""Test fixture for Python class extraction."""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, List, Protocol


class HttpClient:
    """A simple HTTP client for making requests.

    Supports GET, POST, PUT, and DELETE methods
    with automatic retry logic.

    .. versionadded:: 1.0
    """

    def __init__(self, base_url: str, timeout: int = 30) -> None:
        """Initialize the HTTP client.

        Args:
            base_url (str): The base URL for all requests.
            timeout (int): Default request timeout in seconds.
        """
        self.base_url = base_url
        self.timeout = timeout

    @property
    def url(self) -> str:
        """The base URL of the client."""
        return self.base_url

    @property
    def is_connected(self) -> bool:
        """Whether the client has an active connection."""
        return True

    def get(self, path: str, params: Optional[dict] = None) -> dict:
        """Send a GET request.

        Args:
            path (str): The request path.
            params (dict): Optional query parameters.

        Returns:
            dict: The response data.

        Raises:
            ConnectionError: If the server is unreachable.
        """
        pass

    def post(self, path: str, data: dict) -> dict:
        """Send a POST request.

        Args:
            path (str): The request path.
            data (dict): The request body.

        Returns:
            dict: The response data.
        """
        pass

    @staticmethod
    def format_url(base: str, path: str) -> str:
        """Format a full URL from base and path.

        Args:
            base (str): The base URL.
            path (str): The path to append.

        Returns:
            str: The formatted URL.
        """
        return f"{base.rstrip('/')}/{path.lstrip('/')}"

    @classmethod
    def from_env(cls) -> "HttpClient":
        """Create a client from environment variables.

        Returns:
            HttpClient: A new client instance.
        """
        import os
        return cls(os.environ["API_URL"])

    def _internal_retry(self) -> None:
        """This is private and should be skipped."""
        pass

    def __repr__(self) -> str:
        """Dunder methods should be skipped."""
        return f"HttpClient({self.base_url})"


class Color(Enum):
    """Available color options.

    .. versionadded:: 1.2
    """
    RED = "red"
    GREEN = "green"
    BLUE = "blue"
    YELLOW = "yellow"


class Serializable(Protocol):
    """A protocol for objects that can be serialized.

    Any class implementing this protocol must provide
    to_dict and from_dict methods.
    """

    def to_dict(self) -> dict:
        """Convert the object to a dictionary.

        Returns:
            dict: The serialized representation.
        """
        ...

    @classmethod
    def from_dict(cls, data: dict) -> "Serializable":
        """Create an instance from a dictionary.

        Args:
            data (dict): The dictionary to deserialize.

        Returns:
            Serializable: A new instance.
        """
        ...


class BaseProcessor(ABC):
    """Abstract base class for data processors.

    .. deprecated:: 2.0
        Use the new ``Pipeline`` class instead.
    """

    @abstractmethod
    def process(self, data: List[str]) -> List[str]:
        """Process the input data.

        Args:
            data (List[str]): The input data to process.

        Returns:
            List[str]: The processed data.
        """
        ...

    @abstractmethod
    def validate(self, data: List[str]) -> bool:
        """Validate the input data.

        Args:
            data (List[str]): The data to validate.

        Returns:
            bool: True if valid, False otherwise.
        """
        ...


class _InternalHelper:
    """This class is private and should be excluded."""

    def do_stuff(self) -> None:
        pass
