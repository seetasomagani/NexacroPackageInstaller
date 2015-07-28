Instructions to build a Windows executable from this code -

1) Create a key

adt -certificate -cn SelfSigned 2048-RSA sampleCert.pfx [password]


2) Build a .air

adt -package -storetype pkcs12 -keystore [path-to-sampleCert.pfx] NexacroPackageInstaller.air NexacroPackageInstaller-app.xml NexacroPackageInstaller.html .\*.js package.json component css images


3) Build a .exe

adt -package -target native NexacroPackageInstaller.exe NexacroPackageInstaller.air