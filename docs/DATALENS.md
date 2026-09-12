# DataLens workspace

The project hub links to https://datalens-kappa-one.vercel.app/. DataLens profiles CSV files and shows data quality metrics and charts. Source: https://github.com/Piecez2548/DataLens.

DataLens is independently hosted and requires the same approved Supabase identity used by Nexus. Because it runs on a separate origin, users authenticate in DataLens independently; Nexus does not pass session tokens, PINs, CSV contents, or personal data through the project-hub link. DataLens provides a return link to the Nexus hub. CSV uploads on the hosted version are limited to 4 MiB and the service does not persist their contents.

The hub regression test verifies its destination alongside the existing Main link. DataLens production smoke coverage verifies authentication enforcement, health status, and security headers.
