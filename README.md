========Instructions to build a Windows executable from this code========

1) Create a key ---
adt -certificate -cn SelfSigned 2048-RSA SelfSignedCert.pfx [password]


2) Build a .air ---
adt -package -storetype pkcs12 -keystore [path-to-SelfSignedCert.pfx] NexacroPackageInstaller.air NexacroPackageInstaller-app.xml NexacroPackageInstaller.html .\*.js package.json component css images


3) Build a .exe --- 
adt -package -storetype pkcs12 -keystore [path-to-SelfSignedCert.pfx] -target native NexacroPackageInstaller.exe NexacroPackageInstaller.air

=========================================================================

=============================TODO========================================

1) Add error handling to json binding
2) De-couple packages from the installer so that packages are not packaged with the installer and can be downloaded on demand
3) Bind UI to available packages; Upgrade the UI look and feel.