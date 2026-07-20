# AI Project Instructions

This is a character search engine.
 
Goals:

- maintain clean architecture
- avoid unnecessary abstractions
- performance first
- prefer composition over inheritance
- avoid duplicated payload definitions

When modifying Qdrant payloads:

- always update payload schema documentation
- never break backward compatibility
- prefer additive migrations

When changing embeddings:

- document dimensions
- document model
- explain migration path

Never generate code without checking existing implementation.