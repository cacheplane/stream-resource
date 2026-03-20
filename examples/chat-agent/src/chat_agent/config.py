from typing import TypedDict


class Configuration(TypedDict, total=False):
    """Configurable parameters for the chat agent.

    Pass via RunnableConfig['configurable']:
        config = {"configurable": {"system_prompt": "You are a pirate."}}
    """
    system_prompt: str
