"""
Configuration management for MyDailyOps.

Handles loading and saving user preferences to config.json.
"""

import json
import os
from pathlib import Path


class Config:
    """Simple JSON-based configuration manager"""
    
    CONFIG_FILE = "config.json"
    DEFAULT_CONFIG = {
        "last_filter": "all",
        "last_category_filter": None,
        "theme": "light"
    }
    
    @classmethod
    def _get_config_path(cls):
        """Get the full path to config file"""
        # Store in app/config/ directory
        config_dir = Path("app/config")
        config_dir.mkdir(exist_ok=True)
        return config_dir / cls.CONFIG_FILE
    
    @classmethod
    def load(cls):
        """
        Load configuration from JSON file.
        Returns default config if file doesn't exist.
        """
        config_path = cls._get_config_path()
        
        try:
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    print(f"✅ Config loaded from {config_path}")
                    return config
            else:
                print(f"ℹ️ Config file not found, using defaults")
                return cls.DEFAULT_CONFIG.copy()
        except Exception as e:
            print(f"⚠️ Error loading config: {e}")
            return cls.DEFAULT_CONFIG.copy()
    
    @classmethod
    def save(cls, config):
        """
        Save configuration to JSON file.
        """
        config_path = cls._get_config_path()
        
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            print(f"✅ Config saved to {config_path}")
            return True
        except Exception as e:
            print(f"❌ Error saving config: {e}")
            return False
    
    @classmethod
    def get(cls, key, default=None):
        """
        Get a configuration value by key.
        """
        config = cls.load()
        return config.get(key, default)
    
    @classmethod
    def set(cls, key, value):
        """
        Set a configuration value and save to file.
        """
        config = cls.load()
        config[key] = value
        return cls.save(config)
    
    @classmethod
    def update(cls, **kwargs):
        """
        Update multiple configuration values at once.
        """
        config = cls.load()
        config.update(kwargs)
        return cls.save(config)


# Convenience functions for common operations
def get_last_filter():
    """Get the last selected filter"""
    return Config.get("last_filter", "all")


def set_last_filter(filter_name):
    """Save the last selected filter"""
    return Config.set("last_filter", filter_name)


def get_last_category_filter():
    """Get the last selected category filter"""
    return Config.get("last_category_filter", None)


def set_last_category_filter(category):
    """Save the last selected category filter"""
    return Config.set("last_category_filter", category)


def get_theme():
    """Get the current theme preference"""
    return Config.get("theme", "light")


def set_theme(theme):
    """Save the theme preference"""
    if theme not in ["light", "dark"]:
        theme = "light"
    return Config.set("theme", theme)

