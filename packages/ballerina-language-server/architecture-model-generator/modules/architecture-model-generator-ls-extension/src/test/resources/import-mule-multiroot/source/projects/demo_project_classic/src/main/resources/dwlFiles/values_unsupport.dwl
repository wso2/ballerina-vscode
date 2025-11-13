%dw 1.0
%output application/xml
%input payload application/xml
---
[1, 2, 3, 4] map $ + 1
