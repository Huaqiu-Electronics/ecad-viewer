import os

i = 0

with open( 'CKJ_lib.bak' ) as f:
    for line in f:
        tok = line.split()
        if len(tok) == 0:
            print( '' )
            continue

        if tok[0] == 'P':
            tok[3:-2:2] = [str( int( t ) * 1.5 ) for t in tok[3:-2:2]]
        elif tok[0] == 'X' and int( tok[3] ) > 0:
            tok[3] = '1450'

        print( ' '.join( tok ) )
        
        