name = input("Name: ")
age = input("Age: ")
if age >= 18:
    print(name + " can vote")
else:
    years = 18 - age
    print(name + " can vote in " + years + " years")
